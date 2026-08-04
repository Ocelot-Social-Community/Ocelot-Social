# Backend Zero-Downtime-Deployment — Konzept

Stand: 2026-08-04
Status: Phase 1 umgesetzt (Chart + Instanz-Konfigurationen), Phase 2/3 offen

> **Änderungen gegenüber dem Stand 2026-05-20**
>
> - Phase 1 ist im Chart umgesetzt: `stateful-set.yaml` → `deployment.yaml`, PVC entfernt, Readiness-/Liveness-Probe, Migrationen als initContainer mit vorgeschaltetem Datenbank-Warten (Abschnitt 3b).
> - **Korrektur zu Schritt 5:** Der `uploads`-PVC stammt *nicht* aus `volumeClaimTemplates`. Er war ein reguläres Helm-Template und wird beim Upgrade automatisch gelöscht — siehe unten.
> - **Offene Frage „Maintenance-Container" beantwortet:** kein weiterer Workload mountet `uploads`.
> - **Offene Frage „Multi-Replica-Tauglichkeit" beantwortet — negativ.** Siehe Abschnitt 2.1. Deshalb bleiben `replicas: 1` und `maxSurge: 0` vorerst fest verdrahtet.

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

Verifiziert: Die einzigen Schreibzugriffe auf die Platte sind `branding/overlayRuntimeFiles.ts` (Branding-Overlay ins Image-`public/` beim Bootstrap, bewusst ephemer) und `graphql/print-schema.ts` (Build-Tool). Kein Pfad schreibt nach `public/uploads`. Auch kein anderer Workload des Charts mountet das Volume — weder maintenance noch webapp noch imagor.

## 2.1 Stateless bei Dateien — nicht bei Subscriptions

Die Aussage „das Backend ist wieder skalierbar" gilt **nur für Dateien**. Für Subscriptions gilt sie nicht:

- `src/context/pubsub.ts:18` fällt auf einen **prozesslokalen** `PubSub` zurück, sobald `REDIS_DOMAIN`, `REDIS_PORT` oder `REDIS_PASSWORD` fehlt.
- Im Chart existiert **kein Redis** und kein einziges `REDIS_*`-Env; die Instanzen führen `REDIS_PASSWORD: null`.

Damit erreichen Events nur die Clients, deren WebSocket am selben Pod hängt. Betroffen sind Chat/Rooms (`resolvers/rooms.ts`), Video-Call-Teilnehmerzahlen (`resolvers/videoCalls.ts`) und Policy-/Rollenänderungen. Der LiveKit-Webhook trifft ohnehin nur einen Pod. Zusätzlich startet `server.ts` den LiveKit-Poller (`startLiveKitPoller`) in **jedem** Pod — bei N Replicas laufen N Poller.

Das blockiert nicht den Umbau auf ein Deployment, wohl aber `replicas > 1` **und** `maxSurge > 0`: Auch ein Surge lässt zwei Pods parallel laufen. Beides ist deshalb in `deployment.yaml` fest verdrahtet und dort kommentiert, statt über Values konfigurierbar zu sein.

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

Der PVC war via Velero-Annotation für Backup markiert (im alten `stateful-set.yaml`). Vor dem Abschalten noch einmal explizit snappen — und den Inhalt lokal sichern, falls jemand doch noch einen Restbestand findet.

Dafür gibt es `deployment/scripts/backup-uploads-pvcs.sh`: findet alle `*-uploads`-PVCs im aktuellen Kubernetes-Kontext, streamt ihren Inhalt per `tar` über `kubectl exec` aus dem Pod heraus, der das Volume ohnehin mountet (kein zweiter Mount — RWO), verifiziert jedes Archiv gegen die Dateizahl im Pod und schreibt ein Manifest mit Prüfsummen. Das Skript ist read-only gegenüber dem Cluster; Löschen bleibt ein separater, bewusster Schritt.

```sh
deployment/scripts/backup-uploads-pvcs.sh --dry-run          # erst schauen
deployment/scripts/backup-uploads-pvcs.sh -o ./uploads-backup
```

### Schritt 3 — Chart-Umbau

> **Umgesetzt.** Maßgeblich sind die Dateien im Chart, nicht die YAML-Entwürfe hier. Zwei bewusste Abweichungen vom Entwurf:
>
> - `replicas` ist **nicht** über Values konfigurierbar, sondern fest `1` — siehe Abschnitt 2.1.
> - Der Migrations-**Hook-Job aus 3b wurde verworfen**, die Migration bleibt ein initContainer. Begründung in 3b.

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

#### 3b) Migrationen: Hook-Job verworfen, initContainer bleibt

Der ursprüngliche Entwurf sah einen Helm-Hook-Job (`pre-install,pre-upgrade`) vor. **Das ist an der Betriebsrealität gescheitert und wurde zurückgebaut.**

Neo4j ist ein eigener Helm-Release und startet regelmäßig deutlich später als das Backend — Wartezeiten von 10–20 Minuten sind normal. Ein Hook-Job blockiert genau so lange den `helm upgrade`, denn Helm wartet auf den Abschluss des Hooks, und zwar innerhalb von `--timeout` (Default 5 min). Ergebnis: entweder scheitert der Release an einer Datenbank, die völlig legitim noch hochfährt, oder die Deploy-Pipeline hängt zwanzig Minuten.

Die Migration bleibt deshalb im Pod, aber aufgeteilt auf **zwei** initContainer:

1. `<release>-backend-wait-db` — pollt den Bolt-Port aus `NEO4J_URI` alle 5 s, bis er annimmt, längstens `backend.migrations.waitForDatabaseSeconds` (Default 1500 s / 25 min). Der Pod steht währenddessen in `Init` und kostet nichts. Sowohl das Zerlegen der URI als auch die Verbindungsprüfung nutzen `node`, nicht Shell-Bordmittel: busybox' `nc` hat kein portables `-z`, und `${NEO4J_URI#*://}` greift bei Userinfo, Pfad, Routing-Query (`neo4j://host:7687?policy=eu`) oder IPv6-Literal daneben — mit dem Ergebnis, dass der Container den vollen Timeout gegen den falschen Host wartet. `new URL()` deckt alle Fälle ab, eine unparsbare URI bricht per `set -e` sofort ab.
2. `<release>-backend-migrations` — führt `yarn prod:migrate init && yarn prod:migrate up` genau einmal aus.

Die Aufteilung ist der Punkt: Eine *verspätete* Datenbank ist erwartetes Verhalten und wird lautlos abgefangen. Eine *kaputte* Migration schlägt dagegen sofort im zweiten Container fehl, statt in einer langen Retry-Schleife zu verschwinden. Ein Retry-Loop um die Migration selbst würde beide Fälle vermischen.

Wie sich das im Cluster zeigt: Ein fehlschlagender initContainer beendet nicht den Pod, sondern wird bei `restartPolicy: Always` wiederholt gestartet — `kubectl get pods` zeigt `Init:CrashLoopBackOff` (bzw. `Init:Error` zwischen den Versuchen), nicht den gewöhnlichen `CrashLoopBackOff` eines App-Containers. Der Fehler steht in `.status.initContainerStatuses`, die Logs holt man gezielt mit `kubectl logs <pod> -c <release>-backend-migrations`; ohne `-c` fragt man den Hauptcontainer ab, der noch gar nicht gestartet ist.

Warum der Race-Einwand aus dem Entwurf hier nicht greift: Bei `replicas: 1` und `maxSurge: 0` läuft zu keinem Zeitpunkt mehr als ein Pod, also auch nur eine Migration. Das ist bewusst gekoppelt — wer `replicas` erhöht, muss die Migration vorher aus dem Pod herausziehen (Job plus Gate über die Job-Completion, dafür RBAC nötig).

`progressDeadlineSeconds` des Deployments wird aus `waitForDatabaseSeconds` abgeleitet (+ 600 s Puffer). Ohne das meldet das Deployment `ProgressDeadlineExceeded` und `kubectl rollout status` schlägt fehl, während der Pod völlig zu Recht noch wartet.

##### Der alte „Pod muss von Hand gelöscht werden"-Fall

Bisher blieb ein im Init hängender Backend-Pod so lange stehen, bis man ihn manuell löschte — ein neues Deployment lief nicht an. Das war kein Migrations-, sondern ein **StatefulSet**-Problem: Mit `podManagementPolicy: OrderedReady` wartet der Controller darauf, dass der bestehende Pod `Ready` wird, bevor er ihn ersetzt. Ein Pod in `Init` wird nie `Ready` — Deadlock.

Mit einem Deployment ist das erledigt: Ein neuer Rollout erzeugt ein neues ReplicaSet, das alte wird auf 0 skaliert und der hängende Pod dabei terminiert. Der Umbau aus 3a behebt diesen Fall also mit, unabhängig vom Migrationsmechanismus.

#### 3c) Surge-Strategie und Migrationen koordinieren

Solange ihr noch **destruktive** Migrationen habt (Beispiel: `20260327120000-remove-content-excerpt.ts`), bricht das Expand-and-Contract-Prinzip. Während der Surge-Phase laufen alter und neuer Code parallel — der alte würde auf gelöschte Properties zugreifen. Zwei Optionen:

- **Pragmatisch (sofort):** `maxSurge: 0, maxUnavailable: 1` setzen → klassisches Recreate-ähnliches Verhalten, kein Parallelbetrieb, aber kurzes Downtime-Fenster bleibt. Ist immer noch besser als StatefulSet, weil InitContainer-Migrations weg sind und der Readiness-Check kein vorzeitiges Routing zulässt.
- **Sauber (mittelfristig):** Expand-and-Contract-Konvention etablieren (siehe Abschnitt 4), dann `maxSurge: 1, maxUnavailable: 0` ohne Risiko aktivieren.

### Schritt 4 — Erste Umstellung enthält ein einmaliges Wartungsfenster

Helm kann das `kind` einer Ressource nicht in-place ändern. StatefulSet und Deployment sind trotz gleichen Namens zwei verschiedene Objekte, und Helm wendet beim `upgrade` **zuerst** das Zielmanifest an und löscht erst danach, was nur noch im alten Release steht. Der Wechsel ist also kein Rolling Update, sondern ein kurzer Parallelzustand: das neue Deployment startet seinen Pod, während der alte StatefulSet-Pod noch läuft — zwei Backends gegen dieselbe Datenbank, jedes mit eigenem Migrations-InitContainer. Genau das soll das manuelle Herunterskalieren verhindern; das Wartungsfenster ist der Preis dafür, nicht die Folge einer Helm-Löschung. Empfehlung:

- Wartungsfenster ankündigen.
- Manuell vorab herunterskalieren **und auf den tatsächlich verschwundenen Pod warten** — `scale` schreibt nur den Sollzustand und kehrt sofort zurück; startet das Upgrade in diesem Fenster, ist der Parallelzustand wieder da, den der Schritt gerade verhindern soll:

  ```sh
  kubectl -n <namespace> scale statefulset <release>-backend --replicas=0
  kubectl -n <namespace> wait --for=delete pod -l app=<release>-backend --timeout=10m
  ```

  `no matching resources found` heißt: schon weg — der gewünschte Zustand.
- `helm upgrade` mit neuem Chart.
- Danach läuft nur noch das Deployment, ab da ist zero-downtime möglich.

Die Reihenfolge (erst anlegen, dann verwaiste Ressourcen löschen) ist Helm-Verhalten, kein Vertrag — auf einer Stage-Instanz mit der real eingesetzten Helm-Version einmal beobachten, bevor eine Produktionsinstanz drankommt.

### Schritt 5 — PVC: Achtung, Helm löscht ihn selbst

**Korrektur gegenüber der ursprünglichen Fassung dieses Dokuments.** Die Annahme, der PVC stamme aus `volumeClaimTemplates`, heiße `uploads-<release>-backend-0` und überlebe das Entfernen des Workloads, war falsch.

Tatsächlich war der PVC ein reguläres Helm-Template (`backend/persistent-volume-claim.yaml`) namens `{{ .Release.Name }}-uploads`, **ohne** `helm.sh/resource-policy: keep`. Mit dem Entfernen des Templates löscht Helm den PVC beim nächsten `apply` automatisch — und bei einer StorageClass mit `reclaimPolicy: Delete` ist der Inhalt in derselben Sekunde weg.

Die Absicherung gehört deshalb **vor** das Upgrade, nicht danach:

```sh
# 1. PV ermitteln und auf Retain setzen, damit das Löschen des PVCs die Daten nicht mitnimmt
PV=$(kubectl -n <namespace> get pvc <release>-uploads -o jsonpath='{.spec.volumeName}')
kubectl patch pv $PV -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'

# 2. Inhalt sichern (Velero-Snapshot und/oder Kopie nach S3)
```

Nach erfolgreicher Verifikation — Bilder laden, keine 404 auf legacy `/uploads/...` — kann das freigewordene PV manuell entfernt werden. Bis dahin bleibt es als `Released` liegen und kostet nur Speicher.

## 4. Migrations-Konvention: Expand-and-Contract

Sobald zwei Backend-Versionen kurzzeitig parallel laufen (Surge oder Mehrfach-Replica), muss jede Schema-Migration **backward-kompatibel** sein. Im aktuellen Migrations-Verzeichnis ist diese Konvention nicht durchgängig eingehalten.

Konvention für künftige Migrationen:

1. **Expand** (Release N): nur additiv — neue Properties/Labels/Indizes anlegen. Code-Release N schreibt schon ins neue Schema, liest aber noch das alte als Fallback.
2. **Backfill** (zwischen N und N+1): Daten in die neuen Felder kopieren. Idempotent.
3. **Switch** (Release N+1): Code liest/schreibt ausschließlich neue Felder.
4. **Contract** (Release N+2): destruktive Migration, alte Felder entfernen. Sicher, weil keine alte Codeversion mehr läuft.

Für Neo4j heißt das praktisch: keine Property-Renames in einem Schritt — immer `addNew`, `dual-write`, `dropOld` als drei separate Migrationen über mindestens zwei Releases.

Diese Konvention sollte ins `CONTRIBUTING.md` aufgenommen und im PR-Review eingefordert werden.

## 5. Umsetzungsstand

### Phase 1 — erledigt (Chart)

- `backend/stateful-set.yaml` → `backend/deployment.yaml`, `replicas: 1`, `maxSurge: 0 / maxUnavailable: 1`, Readiness- und Liveness-Probe auf `tcpSocket: 4000`.
- `backend/persistent-volume-claim.yaml` gelöscht, Volume und VolumeMounts entfernt, Velero-Annotation entfernt.
- Migrationen bleiben initContainer, ergänzt um einen vorgeschalteten `wait-db`-Container (Abschnitt 3b). Neuer Wert `backend.migrations.waitForDatabaseSeconds` (Default 1500).
- `progressDeadlineSeconds` aus dem Wartewert abgeleitet, damit ein langsames Neo4j nicht als fehlgeschlagener Rollout gilt.
- `backend.storage` aus `values.yaml` entfernt; der Schlüssel bleibt dort als Kommentar dokumentiert, damit klar ist, warum er weg ist.
- `backend/public/uploads/` (nur noch ein leeres, versioniertes Verzeichnis mit `.gitkeep`) aus dem Backend entfernt. Im Code gab es nichts weiter zu löschen: `src/uploads/` ist ausschließlich der S3-Service, kein Pfad schreibt auf die Platte (Abschnitt 2).

### Phase 1b — erledigt (Instanz-Konfigurationen)

Die Konfigurationen unter `deployment/configurations/` sind eigene Repositories und werden nicht mit dem Chart mitgeliefert — sie müssen separat nachgezogen und dort committet werden.

- `backend.storage` aus allen neun Konfigurationen entfernt. Solange der Schlüssel dort steht, ist er wirkungslos (Helm ignoriert unbenutzte Values), aber irreführend.
- `needs: [ocelot-neo4j]` am `ocelot-social`-Release in allen neun Konfigurationen — Neo4j wird zuerst appliziert.
- `neo4j.storage` / `neo4j.storageBackups` bleiben: Neo4j ist echt zustandsbehaftet und weiterhin ein StatefulSet.

Gewinn: kein RWO-Lock mehr; eine verspätet startende Datenbank wird bis zu 25 Minuten lautlos abgewartet, statt den Pod in CrashLoopBackOff zu treiben; ein im Init hängender Pod blockiert kein neues Deployment mehr (siehe 3b). **Kein** Zero-Downtime — das hängt an Phase 2.

### Phase 2 — Redis, dann echtes Zero-Downtime

1. Redis ins Chart aufnehmen (oder extern bereitstellen) und `REDIS_DOMAIN`/`REDIS_PORT`/`REDIS_PASSWORD` verdrahten. `pubsub.ts` schaltet dann von allein auf `RedisPubSub` um — kein Codechange nötig.
2. Migrations-Konvention (Expand/Contract, Abschnitt 4) ins `CONTRIBUTING.md` aufnehmen und im Review einfordern.
3. Erst danach `maxSurge: 1, maxUnavailable: 0` — und erst, wenn mindestens ein destruktiver Migrationszyklus sauber nach Expand-and-Contract durchgelaufen ist.

### Phase 3 — `replicas > 1`

1. LiveKit-Poller auf Singleton umbauen (Leader-Election oder eigener Workload) — sonst pollt jede Replica.
2. Echten `/healthz`-Endpoint ergänzen und die Probes darauf umstellen.
3. Systematische Prüfung weiterer Single-Instance-Annahmen.

### Cutover pro Instanz (einmalig, unabhängig von den Phasen)

1. DB-Audit: keine `/uploads`-URLs mehr in Neo4j (Schritt 1).
2. PV auf `Retain` patchen und mit `deployment/scripts/backup-uploads-pvcs.sh` sichern (Schritt 5 und 2 — **vor** dem Upgrade, solange der alte Pod das Volume noch mountet!).
3. `kubectl scale statefulset <release>-backend --replicas=0`, dann `kubectl wait --for=delete pod -l app=<release>-backend --timeout=10m` — erst weitermachen, wenn der alte Pod wirklich weg ist (Schritt 4).
4. `helmfile apply`, verifizieren.
5. Zuerst auf einer Stage-Instanz durchspielen, Produktion einzeln nachziehen.

## 6. Offene Fragen / Risiken

- **HTTP-Health-Endpoint:** Die Probes prüfen per `tcpSocket`, das beweist nur einen offenen Listener — nicht, dass Neo4j erreichbar oder das Bootstrapping fertig ist. Ein `/healthz` wäre semantisch ehrlich.
- **Bolt-Port ≠ Datenbank bereit:** `wait-db` prüft nur, ob der Port annimmt. Neo4j kann kurz danach noch Indizes aufbauen. Der Migrations-Container fängt das über den Pod-Restart ab, aber ein Cypher-Ping (`RETURN 1`) wäre die ehrlichere Prüfung.
- **Ordering ≠ Readiness:** `needs: [ocelot-neo4j]` ist in allen neun Konfigurationen gesetzt, ordnet aber nur die *Helm-Operationen*. Es wartet **nicht**, bis die Datenbank bereit ist — das bleibt Aufgabe des `wait-db`-initContainers. Ein `wait: true` am neo4j-Release würde echtes Warten erzwingen, aber genau die blockierende Deploy-Pipeline zurückholen, die schon den Hook-Job gekippt hat. Deshalb bewusst nicht gesetzt.
- ~~**Rückwärtskompatibilität für Branding-Forks:** Forks, die das Chart kopiert haben, müssen nachziehen — insbesondere wegen des automatisch gelöschten PVCs. Im CHANGELOG prominent erwähnen.~~ Erledigt, aber **nicht** im CHANGELOG: der wird von `auto-changelog` aus PR-Titeln generiert und taugt nicht für eine Handlungsanweisung. Stattdessen steht die vollständige Cutover-Anleitung jetzt oben in `deployment/TODO-next-update.md` — der Datei, die Betreiber und Forks beim Update lesen.

### Beantwortet

- ~~**Maintenance-Container:** Mount auf `/app/public/uploads`?~~ Nein. Kein anderer Workload mountet das Volume.
- ~~**Velero-Annotation** entfernen.~~ Erledigt in Phase 1.
- ~~**Multi-Replica-Tauglichkeit** ungeprüft.~~ Geprüft, Ergebnis negativ — siehe Abschnitt 2.1.
