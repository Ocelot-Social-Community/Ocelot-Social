# Backend Zero-Downtime-Deployment — Konzept

Stand: 2026-05-20
Status: Umsetzungsplan / Diskussionspapier

Dieses Dokument beschreibt, warum das Backend von ocelot.social aktuell beim Deployment eine sichtbare Offline-Phase erzeugt, warum dieser Zustand inzwischen nur noch aus Legacy-Gründen besteht, und wie wir das StatefulSet schrittweise und gefahrlos durch ein normales Deployment ersetzen.

---

## 1. Symptom

Beim Deployment einer neuen Backend-Version (z. B. via Helm) gibt es eine **Offline-Zeit von mehreren Sekunden bis Minuten**, in der das Backend nicht erreichbar ist:

- Der Webapp-Container bleibt während eines Rollouts aktiv, bis der neue erfolgreich hochgefahren ist (zero-downtime).
- Der Backend-Container wird sofort beendet, dann startet der neue. Image-Pull + Container-Start + Migrationen summieren sich zum Downtime-Fenster.

## 2. Diagnose

Es handelt sich nicht um einen Bug, sondern um eine direkte Folge zweier verschiedener Kubernetes-Workload-Typen:

| Komponente | Manifest | Update-Verhalten |
|---|---|---|
| Webapp | `kind: Deployment` (`deployment/helm/charts/ocelot-social/templates/webapp/deployment.yaml`) | Default RollingUpdate mit `maxSurge: 25%` → neuer Pod erst hochfahren, dann alten beenden |
| Backend | `kind: StatefulSet` (`deployment/helm/charts/ocelot-social/templates/backend/stateful-set.yaml`) | StatefulSets ersetzen Pods seriell: alten Pod terminieren, **dann** neuen starten |

Bei einer einzigen Replica heißt das beim Backend konkret: alter Pod weg → Image pullen → InitContainer mit `yarn prod:migrate init && yarn prod:migrate up` (`stateful-set.yaml:21`) → Hauptcontainer-Startup → Ready. Die Summe = Downtime.

### Warum überhaupt StatefulSet?

Historisch wegen des `uploads`-PVCs mit `accessModes: ReadWriteOnce` (`backend/persistent-volume-claim.yaml:6-7`). RWO erlaubt nur einem Pod gleichzeitig den Mount — zwei parallel laufende Backend-Pods sind damit konstruktiv ausgeschlossen, also war kein Surge möglich.

### Heute überholt

Die Uploads sind inzwischen vollständig auf S3 migriert (`backend/src/db/migrations/20250502230521-migrate-to-s3.ts`). Die Migration schließt explizit mit *„The backend does not have disk access anymore."* — die Design-Intention ist also bereits: stateless. Die PVCs existieren nur noch aus Legacy-Gründen.

### Keine sonstigen StatefulSet-Gründe

Geprüft:

- **Headless Service?** Nein. `backend/service.yaml` ist ein normaler ClusterIP-Service ohne `clusterIP: None`. Keine Pro-Pod-DNS-Identität nötig.
- **Pod-Ordinals?** Kein Treffer auf `backend-0` o. ä. in Chart oder Code.
- **Stable Hostnames?** Nicht referenziert.
- **In-Memory-Session/Cache?** Nicht im Backend-Code.
- **Migrations-Singleton?** Migrationen laufen aktuell als InitContainer im Pod, nicht über StatefulSet-Ordering. Kein StatefulSet-spezifisches Pattern.

→ **Der PVC ist der einzige technische Grund**. Sobald er weg ist, kann das StatefulSet durch ein Deployment ersetzt werden.

Ein kleiner Restwert in `public/` bleibt: das Backend serviert per `server.ts:127` `app.use(express.static('public'))` weiterhin statische Dateien — aber das sind nur Image-Builds (`public/img`, `public/providers.json`), keine User-Uploads. Bleibt im Image und braucht keinen PVC.

## 3. Migrationsplan

### Schritt 1 — Pre-Flight-DB-Audit

Vor jedem Cutover pro Instanz in Neo4j vergewissern, dass keine Legacy-URLs mehr auf `/uploads/...` zeigen — sonst würden Bilder nach PVC-Wegfall 404'en:

```cypher
MATCH (i:Image)      WHERE i.url      STARTS WITH '/uploads' RETURN count(i);
MATCH (a:Attachment) WHERE a.url      STARTS WITH '/uploads' RETURN count(a);
// ggf. weitere Knoten mit url-Properties prüfen
```

Erwartet: 0 in jeder Installation. Falls nicht: die S3-Migration für die betroffene Instanz nachfahren, bevor man weitermacht.

### Schritt 2 — Backup als Sicherheitsnetz

Der PVC ist bereits via Velero-Annotation für Backup markiert (`stateful-set.yaml:11-12`). Vor dem Abschalten noch einmal explizit snappen — und auch den Inhalt einmal nach S3 spiegeln, falls jemand doch noch einen Restbestand findet.

### Schritt 3 — Chart-Umbau

Drei Änderungen in `deployment/helm/charts/ocelot-social/templates/backend/`:

#### 3a) `stateful-set.yaml` → `deployment.yaml`

```yaml
kind: Deployment
apiVersion: apps/v1
metadata:
  name: {{ .Release.Name }}-backend
spec:
  replicas: {{ .Values.backend.replicas | default 1 }}
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: {{ .Release.Name }}-backend
  template:
    metadata:
      labels:
        app: {{ .Release.Name }}-backend
    spec:
      restartPolicy: Always
      containers:
        - name: {{ .Release.Name }}-backend
          image: "{{ .Values.backend.image.repository }}:{{ .Values.backend.image.tag | default (include "defaultTag" .) }}"
          imagePullPolicy: {{ quote .Values.global.image.pullPolicy }}
          {{- include "resources" .Values.backend.resources | indent 10 }}
          env:
            - name: GRAPHQL_URI
              value: "http://{{ .Release.Name }}-backend:4000"
            - name: CLIENT_URI
              value: "https://{{ .Values.domain }}"
            - name: IMAGOR_PUBLIC_URL
              value: "https://{{ .Values.domain }}/imagor"
          envFrom:
            - configMapRef:
                name: {{ .Release.Name }}-backend-env
            - secretRef:
                name: {{ .Release.Name }}-backend-secret-env
          ports:
            - containerPort: 4000
              protocol: TCP
          readinessProbe:
            tcpSocket:
              port: 4000
            initialDelaySeconds: 5
            periodSeconds: 5
          livenessProbe:
            tcpSocket:
              port: 4000
            initialDelaySeconds: 30
            periodSeconds: 20
```

- Volumes und InitContainer entfallen.
- PVC-Template `persistent-volume-claim.yaml` löschen.
- `readinessProbe` sorgt dafür, dass der Service erst dann auf den neuen Pod routet, wenn er HTTP wirklich annimmt.

Sobald GraphQL einen dedizierten Health-Endpoint anbietet, sollte `tcpSocket` durch `httpGet` auf diesen Endpoint ersetzt werden — das ist semantisch ehrlicher.

#### 3b) Migrationen als Helm-Hook-Job

Neue Datei `templates/backend/migrations-job.yaml`:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ .Release.Name }}-backend-migrate-{{ .Release.Revision }}
  annotations:
    "helm.sh/hook": pre-upgrade,pre-install
    "helm.sh/hook-weight": "0"
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  backoffLimit: 0
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: "{{ .Values.backend.image.repository }}:{{ .Values.backend.image.tag | default (include "defaultTag" .) }}"
          imagePullPolicy: {{ quote .Values.global.image.pullPolicy }}
          command: ["/bin/sh", "-c", "yarn prod:migrate init && yarn prod:migrate up"]
          envFrom:
            - configMapRef:
                name: {{ .Release.Name }}-backend-env
            - secretRef:
                name: {{ .Release.Name }}-backend-secret-env
```

Wichtig: dieser Job läuft **vor** dem Pod-Rollout, einmalig, und ist kein Teil des Pods. Vorteile:

- Beim Surge versuchen nicht mehrere Backend-Pods parallel `migrate up` (Race-Vermeidung).
- Pod-Startzeit wird kürzer, weil keine Migrationen im InitContainer mehr.
- Bei einem fehlschlagenden Migrations-Run wird das Pod-Rollout gar nicht erst gestartet (Hook-Job schlägt fehl, Release wird abgebrochen).

#### 3c) Surge-Strategie und Migrationen koordinieren

Solange ihr noch **destruktive** Migrationen habt (Beispiel: `20260327120000-remove-content-excerpt.ts`), bricht das Expand-and-Contract-Prinzip. Während der Surge-Phase laufen alter und neuer Code parallel — der alte würde auf gelöschte Properties zugreifen. Zwei Optionen:

- **Pragmatisch (sofort):** `maxSurge: 0, maxUnavailable: 1` setzen → klassisches Recreate-ähnliches Verhalten, kein Parallelbetrieb, aber kurzes Downtime-Fenster bleibt. Ist immer noch besser als StatefulSet, weil InitContainer-Migrations weg sind und der Readiness-Check kein vorzeitiges Routing zulässt.
- **Sauber (mittelfristig):** Expand-and-Contract-Konvention etablieren (siehe Abschnitt 4), dann `maxSurge: 1, maxUnavailable: 0` ohne Risiko aktivieren.

### Schritt 4 — Erste Umstellung enthält ein einmaliges Wartungsfenster

Helm kann das `kind` einer Ressource nicht in-place ändern: beim ersten `helm upgrade` mit dem neuen Chart wird der alte StatefulSet (samt Pod) gelöscht **bevor** das neue Deployment Pods erzeugt. Empfehlung:

- Wartungsfenster ankündigen.
- Manuell vorab: `kubectl scale statefulset <release>-backend --replicas=0`.
- `helm upgrade` mit neuem Chart.
- Danach läuft nur noch das Deployment, ab da ist zero-downtime möglich.

### Schritt 5 — PVC-Reste aufräumen

StatefulSet-PVCs werden von Kubernetes **nicht** automatisch entfernt, auch wenn das StatefulSet weg ist. Sie heißen typisch `uploads-<release>-backend-0`. Nach erfolgreicher Verifikation (Bilder laden, keine 404 auf legacy `/uploads/...`):

```sh
kubectl get pvc -l app=<release>-backend
kubectl delete pvc uploads-<release>-backend-0
```

Optional: vorher den `persistentVolumeReclaimPolicy` des zugehörigen PVs auf `Retain` setzen, falls der Storage-Provider standardmäßig `Delete` ist und der Inhalt noch ein paar Wochen aufbewahrt werden soll.

## 4. Migrations-Konvention: Expand-and-Contract

Sobald zwei Backend-Versionen kurzzeitig parallel laufen (Surge oder Mehrfach-Replica), muss jede Schema-Migration **backward-kompatibel** sein. Im aktuellen Migrations-Verzeichnis ist diese Konvention nicht durchgängig eingehalten.

Konvention für künftige Migrationen:

1. **Expand** (Release N): nur additiv — neue Properties/Labels/Indizes anlegen. Code-Release N schreibt schon ins neue Schema, liest aber noch das alte als Fallback.
2. **Backfill** (zwischen N und N+1): Daten in die neuen Felder kopieren. Idempotent.
3. **Switch** (Release N+1): Code liest/schreibt ausschließlich neue Felder.
4. **Contract** (Release N+2): destruktive Migration, alte Felder entfernen. Sicher, weil keine alte Codeversion mehr läuft.

Für Neo4j heißt das praktisch: keine Property-Renames in einem Schritt — immer `addNew`, `dual-write`, `dropOld` als drei separate Migrationen über mindestens zwei Releases.

Diese Konvention sollte ins `CONTRIBUTING.md` aufgenommen und im PR-Review eingefordert werden.

## 5. Empfohlene Reihenfolge der Umsetzung

1. DB-Audit-Script bereitstellen (Cypher-Query als Bash-Wrapper im Repo).
2. Chart-PR: StatefulSet → Deployment, Migrations-Job, Readiness-Probe. Initial mit `maxSurge: 0, maxUnavailable: 1` (sicherer Default).
3. Auf einer Stage-Instanz (z. B. `stage.ocelot.social`) durchspielen und verifizieren.
4. Migrations-Konvention (Expand/Contract) ins `CONTRIBUTING.md` aufnehmen.
5. Produktions-Instanzen einzeln umstellen — Wartungsfenster pro Instanz für den Einmal-Cutover, danach PVCs manuell löschen.
6. Folge-PR: `maxSurge: 1, maxUnavailable: 0` aktivieren, sobald die Migrations-Konvention etabliert und mindestens ein destruktiver Migrations-Zyklus sauber nach Expand-and-Contract durchgelaufen ist.

## 6. Offene Fragen / Risiken

- **HTTP-Health-Endpoint:** Aktuell prüft die `readinessProbe` per `tcpSocket`. Ein semantisch ehrlicher `/healthz`-Endpoint (z. B. DB-Erreichbarkeit, Bootstrapping fertig) wäre robuster und sollte ergänzt werden.
- **Multi-Replica-Tauglichkeit:** Vor dem Schritt auf `replicas > 1` muss verifiziert werden, dass das Backend keine impliziten Single-Instance-Annahmen hat (Cron-Jobs, In-Memory-State, Subscriptions). Der aktuelle Code wurde nicht systematisch dahingehend geprüft.
- **Maintenance-Container:** Hat ebenfalls einen Mount auf `/app/public/uploads`? Vor dem PVC-Wegfall überprüfen und ggf. analog umbauen.
- **Velero-Annotation:** Nach PVC-Wegfall ist die `backup.velero.io/backup-volumes: uploads`-Annotation obsolet — mit entfernen.
- **Rückwärtskompatibilität für Branding-Forks:** Forks, die das Chart kopiert haben, müssen nachziehen. Im CHANGELOG prominent erwähnen.
