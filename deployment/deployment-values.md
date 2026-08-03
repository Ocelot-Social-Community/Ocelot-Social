# Deployment Values

For each deployment, you need to set the environment variables and configurations.
Here is some specific information on how to set the values.

## Webapp

We have several configuration possibilities just in the frontend.

### Date Time

In file `branding/constants/dateTime.js`.

- `RELATIVE_DATETIME`
  - `true` (default) or `false`
- `ABSOLUT_DATETIME_FORMAT`
  - definition see [date-fns, format](https://date-fns.org/v3.3.1/docs/format):
    - `P`: just localized date
    - `Pp`: just localized date and time

## E-Mails

You need to set environment variables to send registration and invitation information or notifications to users, for example.

### SPF and DKIM

More and more e-mail providers require settings for authorization and verification of e-mail senders.

### SPF

Sometimes it is enough to create an SPF record in your DNS.

### DKIM

However, if you need DKIM authorization and verification, you must set the appropriate environment variables in: `.env`, `docker-compose.yml` or Helm script `values.yaml`:

```bash
SMTP_DKIM_DOMAINNAME=<your e-mail sender domain>
SMTP_DKIM_KEYSELECTOR=ocelot # "free" name used in DNS as selector. we recommend this
SMTP_DKIM_PRIVATEKEY="-----BEGIN RSA PRIVATE KEY-----\\n<your base64 encoded private key data>\\n-----END RSA PRIVATE KEY-----\\n"
```

You can find out how DKIM works here:

<https://www.ionos.com/digitalguide/e-mail/e-mail-security/dkim-domainkeys/>

To create the private and public DKIM key as DNS records with selector, see here:

<https://knowledge.ondmarc.redsift.com/en/articles/2141592-generating-2048-bits-dkim-public-and-private-keys-using-openssl-on-a-mac>

Information about the required PEM format can be found here:

<https://docs.progress.com/bundle/datadirect-hybrid-data-pipeline-installation-46/page/PEM-file-format.html>

## Neo4j Database

We have several configuration options for our Neo4j database.

### DBMS_DEFAULT_DATABASE – Default Database Name to be Used

If you need to set the default database name in Neo4j to be used for all operations and terminal commands like our backup scripts, you must set the appropriate environment variable in: `.env`, `docker-compose.yml` or Helm script `values.yaml`:

```yaml
DBMS_DEFAULT_DATABASE: "graph.db"
```

The default value is `neo4j` if it is not set.

As example see files:

- `neo4j/.env.template`
- `deployment/docker-compose.yml`
- `deployment/configurations/stage.ocelot.social/kubernetes/values.yaml.template`

## Private Container Images

Public images on the GitHub Container Registry are pulled anonymously and need no configuration at
all. Only if a repository an instance pulls from is **private** does the cluster need a credential.

Note that every instance pulls from at least two GitHub organizations: its own — `it4change`,
`changemedia-at`, `yunite-net` or `ocelot-social-community` — plus `ocelot-social-community` for the
shared neo4j image. Should more than one of them be private, they may well require different tokens.

### Runtime only — the build path is separate

What follows covers the **cluster** pulling images. It does not cover the **build**: a configuration
repository builds its branded images `FROM ghcr.io/ocelot-social-community/ocelot-social/*-base`,
and `publish.yml` authenticates that with the workflow's own `GITHUB_TOKEN`.

That token is scoped to its own repository and **cannot read packages of another organization** —
not even via *Manage Actions access* on the package, which only lists repositories of the same
owner. The branding builds therefore depend on the ocelot base images staying **public**, which is
deliberate: they are the published artifacts of an open source project, so making them private would
protect nothing while breaking every branding pipeline.

Should they ever have to become private, a pull secret will not help. The build would need a cross-
organization PAT, and since Docker resolves registry credentials per *host*, a second `ghcr.io`
login would overwrite the first — the path scoping described below has no equivalent there. The
workflow would have to be split into a PAT-authenticated build and a `GITHUB_TOKEN`-authenticated
push.

### Creating the token

Registry authentication is unrelated to git access — a deploy key cannot be used here, it only
authenticates SSH git operations against a single repository. Use a **classic** personal access
token of a machine user instead:

1. Give the token the `read:packages` scope, and nothing else. `repo` would turn it into a git
   credential as well, which the cluster has no business holding.
2. If the organization enforces SAML SSO, press *Configure SSO → Authorize* on the token afterwards.
   Without that, private packages answer with a 403 and the cause is not obvious from the pod events.
3. Grant the machine user read access to the packages themselves under *Package → Settings → Manage
   Access*. The scope alone does not grant it.
4. Note the expiry date somewhere you will see it again. A token without expiry is worse.

### Storing it

Credentials belong in the sops-encrypted environment file of a configuration, next to the other
secrets, under the key `ghcr`:

```bash
sops edit deployment/configurations/<domain>/helmfile/environments/default.secrets.yaml
```

```yaml
ghcr:
    - registry: ghcr.io/it4change
      username: <machine user>
      password: <classic PAT>
    - registry: ghcr.io/ocelot-social-community
      username: <machine user>
      password: <classic PAT>
```

Each entry is scoped to `host/path`, not to the bare host `ghcr.io`. That is what allows two
organizations with *different* tokens to coexist: the kubelet keyring prefix-matches an image
reference against these keys and picks the longest match. With a single `ghcr.io` key only one token
could ever be stored.

Configurations that also have a `production` environment need the block in **both**
`default.secrets.yaml` and `production.secrets.yaml` — helmfile reads only the files of the selected
environment.

Nothing else has to be touched. `helmfile/values/ocelot.yaml.gotmpl` already passes the key through
to the charts, which then create a `kubernetes.io/dockerconfigjson` Secret and reference it from
every pod. While the `ghcr` key is absent, no Secret is created and no pod references one.

Each of the two releases generates its own Secret (`<release>-image-pull`), so the credential exists
twice in the namespace. To keep a single copy instead, set `imagePullCredentials.existingSecrets` on
the `ocelot-neo4j` release and leave its `registries` empty.

### Verifying

Rendering shows both the Secret and its references without touching a cluster:

```bash
helmfile -e default template | grep -A2 imagePullSecrets
```

A real pull is worth testing once, because a node that already has the image cached will happily
start the pod with a broken credential and the problem only surfaces on the next fresh node:

```bash
kubectl -n <namespace> run pulltest --rm -it --restart=Never \
  --image=ghcr.io/<org>/<private-image>:<tag> \
  --image-pull-policy=Always \
  --overrides='{"spec":{"imagePullSecrets":[{"name":"<release>-image-pull"}]}}'
```

Both flags matter. `imagePullPolicy` lives on the container (`spec.containers[].imagePullPolicy`),
not on the pod, so passing it through `--overrides` would be silently ignored — `kubectl run` has
`--image-pull-policy` for it. And the pull Secret has to be named explicitly: this chart attaches it
to the pod specs it renders, not to the namespace's ServiceAccount, so an ad-hoc `kubectl run` pod
carries no credential at all and would fail against a private image even when the deployment itself
is configured correctly. Substitute the release name, or the name of an `existingSecrets` entry.

`kubectl describe pod` distinguishes the two common failures: 401 points at the token or a missing
SSO authorization, 403 at missing package access.

One caveat worth knowing: once credentials are configured, an **expired or invalid** token makes
pulls fail even for images that are public and would need no authentication at all, because the
registry rejects the request rather than falling back to anonymous access.
