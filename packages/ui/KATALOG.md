# Komponenten-Katalog

> Tracking der Katalogisierung aller bestehenden Komponenten.
> Diese Datei ermöglicht das Unterbrechen und Fortsetzen der Analyse.

---

## Fortschritt

### Übersicht
```
Webapp:     ░░░░░░░░░░  0% (0/? Komponenten)
Styleguide: ░░░░░░░░░░  0% (0/? Komponenten)
───────────────────────────────────────────
Gesamt:     ░░░░░░░░░░  0%
```

### Statistiken
| Metrik | Wert |
|--------|------|
| Webapp Komponenten (geschätzt) | ~60+ |
| Styleguide Komponenten (geschätzt) | ~15 |
| Analysiert | 0 |
| Duplikate gefunden | 0 |
| Zur Konsolidierung markiert | 0 |

---

## Webapp Komponenten

> Quelle: `../../webapp/components/`

| # | Komponente | Status | Duplikat von | Varianten | Priorität | Notizen |
|---|------------|--------|--------------|-----------|-----------|---------|
| 1 | ActionButton | ⬜ Ausstehend | | | | |
| 2 | AvatarMenu | ⬜ Ausstehend | | | | |
| 3 | BadgeSelection | ⬜ Ausstehend | | | | |
| 4 | Badges | ⬜ Ausstehend | | | | |
| 5 | Button | ⬜ Ausstehend | | | | |
| ... | _Weitere werden während der Analyse ergänzt_ | | | | | |

### Status-Legende
- ⬜ Ausstehend
- ⏳ In Arbeit
- ✅ Analysiert
- 🔗 Duplikat (siehe "Duplikat von")
- ⛔ Nicht migrieren (veraltet/ungenutzt)

---

## Styleguide Komponenten

> Quelle: `../../styleguide/src/`
> Live: http://styleguide.ocelot.social/

| # | Komponente | Status | Duplikat von | Varianten | Priorität | Notizen |
|---|------------|--------|--------------|-----------|-----------|---------|
| 1 | _Wird während der Analyse ergänzt_ | ⬜ Ausstehend | | | | |

---

## Duplikate & Konsolidierung

> Hier werden identifizierte Duplikate und Konsolidierungsvorschläge dokumentiert.

| Gruppe | Komponenten | Konsolidierung zu | Status |
|--------|-------------|-------------------|--------|
| _Beispiel: Buttons_ | _Button, ActionButton, BaseButton_ | _OsButton_ | _Vorgeschlagen_ |

---

## Analyse-Protokoll

| Datum | Bearbeiter | Aktion | Details |
|-------|------------|--------|---------|
| _2026-02-04_ | _-_ | _Katalog erstellt_ | _Initiale Struktur_ |

---

## Nächste Schritte

1. [ ] Webapp-Komponenten auflisten (`ls webapp/components/`)
2. [ ] Styleguide-Komponenten auflisten
3. [ ] Komponente für Komponente analysieren
4. [ ] Duplikate markieren
5. [ ] Konsolidierungsplan erstellen

---

## Hinweise zur Nutzung

**Katalogisierung fortsetzen:**
1. Nächste "⬜ Ausstehend" Komponente finden
2. Status auf "⏳ In Arbeit" setzen
3. Komponente analysieren (Code lesen, Varianten identifizieren)
4. Duplikate prüfen
5. Status auf "✅ Analysiert" setzen
6. Fortschritt oben aktualisieren

**Bei Unterbrechung:**
- Aktuellen Stand committen
- Fortschritts-Prozente aktualisieren
- Letzte bearbeitete Komponente notieren
