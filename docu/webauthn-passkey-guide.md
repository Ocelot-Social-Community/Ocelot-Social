# Passkey / WebAuthn / FIDO2 Implementation Guide

This guide outlines a secure reference implementation for WebAuthn-based registration and authentication, including Passkey (discoverable credential) support. It is designed to serve as an auditable artifact and provides both backend and frontend code examples, checklists, and integration notes.

## 1. Audit & Security Checklist

Use the following checklist when implementing WebAuthn. Each item links back to the relevant section below.

1. **TLS Enforcement** – Ensure HTTPS everywhere, including internal service-to-service calls where possible. Redirect or block all HTTP traffic. (See [Security Best Practices](#5-security-best-practices).)
2. **Relying Party (RP) Metadata** – Set `rpId`, `rpName`, and `origin` explicitly. Validate them against incoming requests. (See [Backend Registration Endpoint](#21-registration-endpoint-createchallenge--verifyattestation).)
3. **Challenge Generation & Lifespan** – Generate cryptographically strong random challenges per request. Store challenges server-side with expiration (e.g., 2–5 minutes) and bind to user session / CSRF token. Reject stale or reused challenges. (See [Challenge Management](#24-challenge-management-storage).)
4. **Credential Storage** – Persist `credentialId` (binary/base64url), `publicKey` (COSE), `signCount`, transport hints, and metadata (AAGUID, type). Associate credentials to user accounts with referential integrity. (See [Data Model](#4-data-model--persistence).)
5. **Multiple Authenticators** – Support multiple credentials per user and maintain device metadata for lifecycle management. (See [Authenticator Lifecycle](#51-authenticator-lifecycle).)
6. **Fallback & Recovery** – Provide secure recovery mechanisms (e.g., TOTP, backup codes, hardware tokens) and procedures for lost authenticators. (See [Integration & Recovery](#6-integration-with-existing-auth--2fa).)
7. **Passkey / Discoverable Credential Support** – Support passwordless logins by allowing client-side discoverable credentials. (See [Passkey Support](#7-passkey--discoverable-credentials).)
8. **Attestation Policy** – Decide whether to verify attestation statements (e.g., for high-assurance devices) and document acceptance policy. (See [Attestation Handling](#22-attestation-handling).)
9. **Audit Logging** – Record registration, authentication attempts, and errors with timestamps, IP, user agent, and credential IDs (hashed if needed). (See [Logging](#53-audit-logging--monitoring).)
10. **Replay & Downgrade Protection** – Enforce `signCount` checks, prevent challenge replay, and consider CTAP-level protections when interacting with authenticators. (See [Threat Mitigations](#52-threat-mitigation--hardening).)

## 2. Backend Example (Node.js / Express + @simplewebauthn/server)

Below is a reference implementation using Node.js with TypeScript-like annotations for clarity. Dependencies: `express`, `@simplewebauthn/server`, `@simplewebauthn/types`, `@simplewebauthn/browser` (for client type hints), `uuid`, and a session store (e.g., Redis).

### 2.1 Registration Endpoint (CreateChallenge & VerifyAttestation)

```ts
import express from 'express';
import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';
import type {
  RegistrationCredentialJSON,
  GenerateRegistrationOptionsOpts,
} from '@simplewebauthn/types';
import { v4 as uuidv4 } from 'uuid';
import { getUserById, saveCredential, listUserCredentials, saveChallenge } from './db';

const router = express.Router();

// Shared RP metadata (must match frontend origin & relying party)
const rpName = 'Acme Inc.';
const rpID = 'example.com'; // FQDN without protocol
const origin = 'https://example.com';

router.post('/webauthn/register/options', async (req, res, next) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const existingCredentials = await listUserCredentials(userId);

    const opts: GenerateRegistrationOptionsOpts = {
      rpName,
      rpID,
      userID: user.id,
      userName: user.email,
      userDisplayName: user.displayName,
      attestationType: 'none', // or 'indirect' / 'direct' per policy
      authenticatorSelection: {
        residentKey: 'preferred', // enable discoverable credentials
        userVerification: 'preferred',
        requireResidentKey: false,
        authenticatorAttachment: undefined, // allow cross-platform + platform
      },
      excludeCredentials: existingCredentials.map((cred) => ({
        id: cred.credentialId,
        type: 'public-key',
        transports: cred.transports,
      })),
    };

    const options = await generateRegistrationOptions(opts);

    // Persist challenge with expiration (e.g., 5 minutes)
    await saveChallenge({
      challenge: options.challenge,
      userId,
      type: 'registration',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    res.json(options);
  } catch (error) {
    next(error);
  }
});

router.post('/webauthn/register/verify', async (req, res, next) => {
  try {
    const body = req.body as RegistrationCredentialJSON;
    const userId = req.session.userId;
    const expectedChallenge = await getAndInvalidateChallenge(userId, 'registration');

    if (!expectedChallenge) {
      return res.status(400).json({ error: 'Registration challenge missing or expired.' });
    }

    const verification = await verifyRegistrationResponse({
      credential: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    const { verified, registrationInfo } = verification;

    if (!verified || !registrationInfo) {
      return res.status(400).json({ error: 'Registration failed verification.' });
    }

    const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo;

    await saveCredential({
      id: uuidv4(),
      userId,
      credentialId: Buffer.from(credential.credentialID),
      publicKey: Buffer.from(credential.credentialPublicKey),
      signCount: credential.counter,
      transports: credential.transports ?? [],
      aaguid: credential.aaguid,
      backedUp: credentialBackedUp,
      deviceType: credentialDeviceType,
      createdAt: new Date(),
      lastUsedAt: null,
    });

    res.json({ status: 'ok' });
  } catch (error) {
    // Distinguish expected vs unexpected errors for logging
    console.error('WebAuthn registration error', error);
    res.status(400).json({ error: 'Invalid registration response.' });
  }
});
```

### 2.2 Attestation Handling

- Set `attestationType` per security requirements. High-security environments may require `direct` attestation and perform certificate chain validation.
- Maintain an allowlist/denylist of AAGUIDs or authenticator metadata to enforce policy.
- Store attestation trust paths only if needed; otherwise discard to reduce sensitive data exposure.

### 2.3 Authentication Endpoint (Challenge & Assertion Verification)

```ts
import { generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticationCredentialJSON } from '@simplewebauthn/types';
import { getUserByEmail, listUserCredentials, updateCredentialSignCount } from './db';

router.post('/webauthn/login/options', async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const userCredentials = await listUserCredentials(user.id);

    const options = await generateAuthenticationOptions({
      rpID,
      timeout: 60000,
      userVerification: 'preferred',
      allowCredentials: userCredentials.map((cred) => ({
        id: cred.credentialId,
        type: 'public-key',
        transports: cred.transports,
      })),
      // Omit allowCredentials to enable discoverable credentials (passkeys)
    });

    await saveChallenge({
      challenge: options.challenge,
      userId: user.id,
      type: 'login',
      expiresAt: new Date(Date.now() + 2 * 60 * 1000),
    });

    res.json({ ...options, userId: user.id });
  } catch (error) {
    next(error);
  }
});

router.post('/webauthn/login/verify', async (req, res, next) => {
  try {
    const body = req.body as AuthenticationCredentialJSON;
    const { userId } = req.body;

    const expectedChallenge = await getAndInvalidateChallenge(userId, 'login');
    if (!expectedChallenge) {
      return res.status(400).json({ error: 'Login challenge missing or expired.' });
    }

    const userCredentials = await listUserCredentials(userId);
    if (!userCredentials.length) {
      return res.status(400).json({ error: 'No registered credentials.' });
    }

    const dbCred = userCredentials.find((cred) => cred.credentialId.equals(Buffer.from(body.rawId, 'base64url')));
    if (!dbCred) {
      return res.status(400).json({ error: 'Credential not recognized.' });
    }

    const verification = await verifyAuthenticationResponse({
      credential: body,
      expectedChallenge,
      expectedRPID: rpID,
      expectedOrigin: origin,
      requireUserVerification: true,
      authenticator: {
        credentialPublicKey: dbCred.publicKey,
        credentialID: dbCred.credentialId,
        counter: dbCred.signCount,
        transports: dbCred.transports,
      },
    });

    const { verified, authenticationInfo } = verification;

    if (!verified || !authenticationInfo) {
      return res.status(401).json({ error: 'Authentication failed.' });
    }

    const { newCounter } = authenticationInfo;

    if (newCounter <= dbCred.signCount) {
      console.warn('Possible cloned authenticator detected for credential', dbCred.id);
      // Optionally mark credential for review or reject entirely
    }

    await updateCredentialSignCount(dbCred.id, newCounter, new Date());

    // Establish session or issue JWT
    req.session.userId = userId;

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('WebAuthn login error', error);
    res.status(400).json({ error: 'Invalid authentication response.' });
  }
});
```

### 2.4 Challenge Management & Storage

- Store challenges in a tamper-resistant cache (e.g., Redis) keyed by user/session and challenge type.
- Include expiration timestamps and invalidate after verification or timeout.
- Bind challenge to additional context (IP, user agent, CSRF token) for anomaly detection.

## 3. Frontend Example (Browser JavaScript)

### 3.1 Registration Flow

```js
async function startRegistration() {
  if (!window.PublicKeyCredential) {
    alert('WebAuthn is not supported on this device. Please use a compatible browser or update your OS.');
    return;
  }

  const resp = await fetch('/webauthn/register/options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!resp.ok) {
    console.error('Failed to retrieve registration options');
    return;
  }

  const options = await resp.json();
  options.challenge = base64urlToBuffer(options.challenge);
  options.user.id = base64urlToBuffer(options.user.id);
  options.excludeCredentials = options.excludeCredentials?.map((cred) => ({
    ...cred,
    id: base64urlToBuffer(cred.id),
  }));

  try {
    const credential = await navigator.credentials.create({ publicKey: options });

    const credentialJSON = await toPublicKeyCredentialJSON(credential);

    const verifyResp = await fetch('/webauthn/register/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentialJSON),
    });

    if (!verifyResp.ok) {
      const error = await verifyResp.json();
      alert(`Registration failed: ${error.error}`);
    } else {
      alert('Security key registered successfully.');
    }
  } catch (err) {
    console.error('navigator.credentials.create failed', err);
    if (err.name === 'NotAllowedError') {
      alert('Registration timed out or was cancelled.');
    }
  }
}
```

### 3.2 Login Flow

```js
async function startLogin(email) {
  if (!window.PublicKeyCredential) {
    alert('WebAuthn not supported on this device.');
    return;
  }

  const optionsResp = await fetch('/webauthn/login/options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!optionsResp.ok) {
    const error = await optionsResp.json();
    alert(`Login options failed: ${error.error}`);
    return;
  }

  const options = await optionsResp.json();
  options.challenge = base64urlToBuffer(options.challenge);
  options.allowCredentials = options.allowCredentials?.map((cred) => ({
    ...cred,
    id: base64urlToBuffer(cred.id),
  }));

  try {
    const assertion = await navigator.credentials.get({ publicKey: options });
    const assertionJSON = await toPublicKeyCredentialJSON(assertion);

    const verifyResp = await fetch('/webauthn/login/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...assertionJSON, userId: options.userId }),
    });

    if (!verifyResp.ok) {
      const error = await verifyResp.json();
      alert(`Authentication failed: ${error.error}`);
    } else {
      window.location.href = '/dashboard';
    }
  } catch (err) {
    console.error('navigator.credentials.get failed', err);
    if (err.name === 'NotAllowedError') {
      alert('Authentication timed out or was cancelled.');
    } else if (err.name === 'InvalidStateError') {
      alert('Credential not allowed or not registered.');
    }
  }
}
```

### 3.3 Helper Functions

```js
function base64urlToBuffer(base64urlString) {
  const padding = '='.repeat((4 - (base64urlString.length % 4)) % 4);
  const base64 = (base64urlString + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    view[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

async function toPublicKeyCredentialJSON(pubKeyCred) {
  if (!pubKeyCred) {
    throw new Error('No credential provided');
  }

  const json = {
    id: pubKeyCred.id,
    rawId: bufferToBase64url(pubKeyCred.rawId),
    type: pubKeyCred.type,
    clientExtensionResults: pubKeyCred.getClientExtensionResults(),
  };

  if (pubKeyCred.response) {
    json.response = {};
    for (const key of ['attestationObject', 'authenticatorData', 'clientDataJSON', 'signature', 'userHandle']) {
      if (pubKeyCred.response[key]) {
        json.response[key] = bufferToBase64url(pubKeyCred.response[key]);
      }
    }
  }

  return json;
}

function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
```

## 4. Data Model & Persistence

Recommended relational schema (simplified):

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email CITEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT, -- optional if supporting hybrid 2FA
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE webauthn_credentials (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id BYTEA NOT NULL UNIQUE,
  public_key BYTEA NOT NULL,
  sign_count BIGINT NOT NULL,
  transports TEXT[] DEFAULT '{}',
  device_type TEXT,
  backed_up BOOLEAN DEFAULT FALSE,
  aaguid UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE webauthn_challenges (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('registration', 'login')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  consumed_at TIMESTAMP WITH TIME ZONE,
  context JSONB DEFAULT '{}'
);
```

- Store `credential_id` and other binary data in Base64url if the database lacks native binary support.
- Ensure unique constraints on `credential_id` to prevent duplicates and enforce one-to-many mapping between users and credentials.
- Track `revoked_at` to disable compromised authenticators.

## 5. Security Best Practices

### 5.1 Authenticator Lifecycle

- Allow users to register multiple authenticators (security key, platform authenticator, mobile passkey).
- Provide UI to label, rename, and revoke authenticators.
- Require step-up authentication (e.g., password + existing WebAuthn) before allowing deletions.

### 5.2 Threat Mitigation & Hardening

- **Replay Attacks**: Store challenge state server-side and invalidate after one use. Enforce `signCount` increases.
- **Cloned Authenticators**: Detect non-incrementing counters and flag for review.
- **Downgrade / Origin Spoofing**: Validate `origin` and `rpId` strictly. Enforce HTTPS and set HSTS.
- **CTAP Security**: When using CTAP2/Client-side APIs, ensure browsers are up-to-date; avoid custom USB HID handling unless necessary.
- **Rate Limiting**: Apply per-user and per-IP throttling on registration/authentication endpoints.
- **Content Security Policy**: Lock down script origins to prevent malicious script injection that could hijack WebAuthn flows.

### 5.3 Audit Logging & Monitoring

- Log events: registration attempts, verification successes/failures, authenticator revocations, anomaly detections.
- Include metadata: user ID, credential ID (hashed), IP, user agent, timestamp.
- Monitor for repeated failures, abnormal geolocation, or large numbers of credential creations.

## 6. Integration with Existing Auth & 2FA

- **Session Establishment**: After successful WebAuthn login, create server-side sessions (cookies with `Secure`, `HttpOnly`, `SameSite=Strict`) or issue short-lived JWTs (with TLS + audience claims).
- **2FA Combination**: Combine WebAuthn with TOTP or authenticator apps by requiring WebAuthn plus an additional factor for high-risk actions. Store 2FA recovery codes securely (hashed) and enforce regeneration on use.
- **Fallback Channels**: Provide backup codes or customer support workflows when authenticators are lost. Ensure identity verification steps (KYC, security questions) are robust.
- **Progressive Enrollment**: Allow users to opt in/out and offer WebAuthn as part of onboarding.

## 7. Passkey / Discoverable Credentials

- Set `residentKey: 'required'` or `'preferred'` to enable passkeys. Omit `allowCredentials` during login to let browsers auto-discover credentials.
- Ensure user handles (`user.id`) are stable, unique byte arrays (e.g., UUID) shared across devices.
- Implement `userVerification: 'required'` for full passwordless assurance.
- Update UI to prompt users for platform authenticator usage (Face ID, Touch ID, Windows Hello).
- Document that passkeys sync across ecosystems (iCloud, Google Password Manager) and may require additional account recovery policies.

## 8. Error Handling & UX Considerations

- Detect unsupported browsers and suggest upgrades.
- Provide clear messaging for blocked/locked authenticators.
- Handle `AbortError`, `NotAllowedError`, `InvalidStateError`, and `SecurityError` on the client.
- On the server, return generic error responses while logging detailed information for forensic analysis.
- Ensure CSRF protection and same-origin policies for endpoints.

## 9. Documentation for Auditors

Maintain the following artifacts:

- **System Architecture Diagram** showing RP server, client, and authenticator interaction.
- **Sequence Diagrams** for registration and authentication flows, highlighting challenge issuance and verification.
- **Configuration Documentation** detailing RP metadata, allowed origins, session settings, and attestation policy.
- **Runbooks** for credential revocation, lost-device handling, and incident response.
- **Test Evidence** (integration tests, manual test scripts) verifying positive and negative paths.

## 10. Preconditions & Known Pitfalls

- **Browser Support**: Latest versions of Chrome, Edge, Firefox, and Safari on desktop and mobile support WebAuthn Level 2. Passkeys require OS-level support (iOS 16+, Android 13+, Windows 11, macOS Ventura).
- **Platform Limitations**: Some enterprise-managed devices may disable platform authenticators. Provide external hardware key fallback.
- **Cross-Origin IFrames**: WebAuthn restricted in cross-origin iframes unless allowed via `allow="publickey-credentials-get"`.
- **Autofill / UX**: Passkeys integrate with browser autofill; ensure forms are properly marked and that fallback login methods remain accessible.
- **Credential Sync**: Passkeys synced via cloud providers may not immediately propagate; handle duplicate registrations gracefully.
- **Testing**: Use browser devtools virtual authenticators (Chrome) for testing but perform end-to-end testing on real devices.

## Summary

Implementing WebAuthn securely requires strict challenge management, secure credential storage, and robust fallback mechanisms. Ensure TLS, RP metadata validation, and audit logging are enforced. Support multiple authenticators and passkeys for improved UX while maintaining recovery options. Keep documentation up-to-date so auditors can verify compliance, and monitor evolving browser/OS support and CTAP security advisories.
