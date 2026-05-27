/* eslint-disable */
/**
 * GENERATED FILE — do not edit by hand.
 * Source: packages/config-schema/policy.schema.json
 * Regenerate via: yarn workspace @ocelot-social/config-schema build
 */

/**
 * Netzwerk-Policy-Konfiguration (Bucket B) — laufzeit-dynamisch, persistent in Neo4j.
 */
export interface NetworkPolicy {
  /**
   * Ob sich neue Nutzer ohne Einladungs-Code registrieren können.
   */
  publicRegistration: boolean
  /**
   * Ob Registrierung via Einladungs-Code möglich ist.
   */
  inviteRegistration: boolean
  /**
   * Ob das Kategorien-Feature für Posts/Gruppen aktiv ist.
   */
  categoriesActive: boolean
  /**
   * Ob API-Keys-Funktionalität (eigene Schlüssel zur Backend-Nutzung) aktiviert ist.
   */
  apiKeysEnabled: boolean
}
