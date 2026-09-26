**Events auf der Karte! 🗺️📍 – ocelot.social v3.19**

Wo passiert was? Ab v3.19 seht ihr das auf einen Blick. Dieses Release dreht sich vor allem um Events auf der Karte – Termine bekommen endlich einen Ort, und der Ort bekommt eine Karte. 💚

**Events & Karte – der Schwerpunkt**

Bisher waren Events und Karte zwei getrennte Welten. Ab jetzt wachsen sie zusammen:

- **Events auf der Karte** – Veranstaltungen erscheinen dort, wo sie stattfinden
- **Pin-Tool zum Anlegen** – ein Event direkt auf der Karte setzen, statt Adressen zu tippen
- **Exakte Koordinaten *und* Adresse** – der genaue Punkt für die Karte, die lesbare Adresse für Menschen
- **Karte auch in den Einstellungen** – Standortwahl in Nutzer-Einstellungen und Gruppen-Formular nutzt jetzt dieselbe Karte, inklusive verständlicher Hinweise bei Fehleingaben

**Was sonst noch neu ist**

🎙️ Mikrofon-Symbol auf den Video-Kacheln – wer stumm ist, ist jetzt auch sichtbar stumm
🎥 Ton bleibt beim Kamera-Ausschalten erhalten – kein Audio-Verlust mehr in Videokonferenzen
⚡ Spürbar schnellere Feeds – die Abfragen dahinter wurden deutlich optimiert

**Unter der Haube – ein neues Fundament**

Dieses Release ist auch das größte Aufräum-Release seit Langem. Das sieht man nicht, aber man merkt es an Tempo und Stabilität:

- **Eigene Schema-Deklaration im Backend** – die alten Datenbank-Bibliotheken (neode, neo4j-graphql-js) sind vollständig raus
- **Backend auf moderne Module umgestellt**, Tests von Jest auf Vitest migriert und parallelisiert
- **Von yarn auf npm** umgezogen, kleinere Docker-Images, Node-26-Kompatibilität
- **Automatisierte Releases & Changelog** – Versionen und Release-Notes entstehen jetzt direkt aus den Commits
- **Mehr Testabdeckung** und eine automatische Prüfung auf ungewollte optische Änderungen der Oberfläche

**Bugfixes & Aufräumarbeiten**

Benachrichtigungen in versteckten Gruppen funktionieren wieder korrekt, die Vorschau der Gruppenbeschreibung ist gefixt, Favicons werden richtig ausgeliefert und Social-Media-Links, denen der Browser nicht folgen soll, werden gar nicht erst gerendert.

Dazu stabilere e2e-Tests, reparierte Docker- und CI-Strecken – sowie zahlreiche Dependency-Updates für Sicherheit und Stabilität.

🔗 **Vollständiges Changelog:** https://github.com/Ocelot-Social-Community/Ocelot-Social/blob/master/CHANGELOG.md

**Was kommt als Nächstes?**

Die aktuell geplanten Schritte findet ihr wie immer auf unserer Roadmap: 👉 https://ocelot.social/roadmap/

Open Source lebt von euch – wenn euch ocelot.social gefällt, freuen wir uns weiterhin über jede Unterstützung über busFaktor() e.V. 🌱

#ocelotsocial #OpenSource #Update #Events #Karte #busFaktor
