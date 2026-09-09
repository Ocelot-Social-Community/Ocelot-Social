# Todo For Next Update

When you introduce a new version and branding and deploy it on your network, you need to consider the following changes and actions:

## ⚠️ Backend is a Deployment now — the uploads PVC is deleted on upgrade

The backend used to be a `StatefulSet` with a `<release>-uploads` PersistentVolumeClaim. It is a
plain `Deployment` now and the PVC template is gone from the chart. Uploads have lived in S3 since
migration `20250502230521-migrate-to-s3`, so the volume is a leftover — but **removing it is
destructive if you skip the steps below.**

The PVC was a regular Helm template without `helm.sh/resource-policy: keep`. Helm therefore
**deletes it by itself** on the first upgrade with the new chart, and if your StorageClass uses
`reclaimPolicy: Delete` (the default for `hcloud-volumes`, among others) the contents are gone in
the same second. There is no undo.

**Action — in this order, before you upgrade:**

1. Verify no database record still points at the old on-disk path. Expected: `0` everywhere.

   ```cypher
   MATCH (i:Image)      WHERE i.url STARTS WITH '/uploads' RETURN count(i);
   MATCH (a:Attachment) WHERE a.url STARTS WITH '/uploads' RETURN count(a);
   ```

   If it is not `0`, run the S3 migration for that instance first.

2. Copy the volume contents off the cluster **while the old pod is still running** — the volume is
   `ReadWriteOnce`, so once the workload is gone you cannot mount it a second time to reach the
   data:

   ```sh
   deployment/scripts/backup-uploads-pvcs.sh --dry-run          # see what would be copied
   deployment/scripts/backup-uploads-pvcs.sh -o ./uploads-backup
   ```

   The script is read-only against the cluster and verifies every archive against the file count in
   the pod.

3. Keep the underlying volume even after Helm drops the claim:

   ```sh
   PV=$(kubectl -n <namespace> get pvc <release>-uploads -o jsonpath='{.spec.volumeName}')
   kubectl patch pv $PV -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'
   ```

4. Scale the old workload down manually. Helm cannot change the `kind` of a resource in place, and a
   StatefulSet and a Deployment of the same name are two distinct objects: Helm applies the new
   manifest **first** and only then deletes what is left over from the old one. For a moment both
   exist, so **two backend pods run against the same database** — each with its own migration init
   container. Scaling to zero beforehand prevents that, at the price of a **maintenance window** for
   this one upgrade:

   ```sh
   kubectl -n <namespace> scale statefulset <release>-backend --replicas=0
   kubectl -n <namespace> wait --for=delete pod -l app=<release>-backend --timeout=10m
   ```

   The `wait` is not optional. `scale` only writes the desired replica count and returns
   immediately; the pod is still terminating while you type the next command, and a `helm upgrade`
   that starts in that window puts you back in exactly the parallel state this step exists to
   avoid. `no matching resources found` means the pod is already gone — that is the state you want.

   Verify the order on a stage instance with the Helm version you actually deploy with before you
   do this in production.

5. Upgrade, then verify that images still load. Afterwards the `Released` PV can be deleted by hand.

**Action — values:**

- Remove `backend.storage` from your `values.yaml`. The key sized the uploads PVC and no longer does
  anything.
- Optional new key `backend.migrations.waitForDatabaseSeconds` (default `1500`). A starting pod now
  waits that long for Neo4j to accept connections before giving up, in an init container, instead of
  crash-looping while the database is still coming up. Raising it also raises the Deployment's
  `progressDeadlineSeconds`, which is derived from it.
- If your instance keeps its own copy of the chart, port
  `templates/backend/deployment.yaml` and the removal of
  `templates/backend/persistent-volume-claim.yaml` into it.

**What this does and does not buy you:** no more `ReadWriteOnce` lock, a late-starting Neo4j is
waited out silently, and a pod stuck in `Init` no longer has to be deleted by hand before the *next*
rollout can start — a new rollout creates a new ReplicaSet and terminates the stuck pod along with
the old one, where the StatefulSet's `OrderedReady` waited for it to become `Ready` forever. The
rollout it is stuck in still counts as unfinished until `progressDeadlineSeconds` runs out. It is
**not** zero-downtime yet: `replicas` is pinned to `1` and `maxSurge` to `0`, because without Redis the
backend's GraphQL subscriptions are process-local. See
[backend-zero-downtime-konzept.md](../docu/backend-zero-downtime-konzept.md).

## Config changes now cause a rollout — including one restart on this upgrade

Backend, webapp and Neo4j take their configuration through `envFrom`, which Kubernetes resolves
**once**, when the container starts. Changing a value in `backend.env`, `webapp.env` or `neo4j.env`
therefore updated the ConfigMap and stopped there: the pod template stayed byte-identical, Helm saw
nothing to do, and the running pod kept serving the old value until something unrelated happened to
restart it. Those three pod templates now carry `checksum/config` and `checksum/secret` annotations
over the rendered manifests, so a changed value is a changed pod template and Helm rolls it out.

imagor differs: it has no ConfigMap — it takes everything from its secret — so it carries
`checksum/secret` alone. Maintenance follows the same route as backend and webapp now, see below.

**Action:** none — but be aware of two consequences.

- **This upgrade restarts backend, webapp, imagor, maintenance and Neo4j once**, because the
  annotations themselves are new. For the Neo4j StatefulSet that is a short database restart. It
  happens inside the maintenance window you already need for the StatefulSet-to-Deployment switch
  above, so plan them together.
- **From now on, editing `neo4j.env` restarts the database.** That is the honest behaviour — the
  setting was never live before — but treat a heap-size or page-cache change as the restart it is.

Neo4j's `terminationGracePeriodSeconds` is raised to `120` in the same step: the default 30 s can
cut a flush short on a larger graph, and a SIGKILL mid-flush turns the next start into a recovery
run.

## `maintenance.supportEmail` is `maintenance.env.SUPPORT_EMAIL`

The maintenance container took its one setting through a chart field of its own, while every other
workload takes its environment through `<component>.env` → ConfigMap → `envFrom`. It follows the
convention now: there is a `maintenance.env` map and a `<release>-maintenance-env` ConfigMap, and the
pod template carries a `checksum/config` annotation like the others (without it a changed address
would sit in the ConfigMap while the pod keeps serving the old one — nothing else ever restarts a
static page).

`SUPPORT_EMAIL` still **defaults to `backend.env.SUPPORT_EMAIL`**, so the address on the page and the
one the backend uses cannot disagree.

**Action:** only if you set `maintenance.supportEmail` explicitly — it is ignored now. Write

```yaml
maintenance:
  env:
    SUPPORT_EMAIL: "support@example.org"
```

If you never set it, there is nothing to do: the backend fallback is unchanged.

## The Neo4j volumes are protected against Helm now

`<release>-neo4j-data` and `<release>-neo4j-backups` carry `helm.sh/resource-policy: keep`. They
were ordinary templates before, which is the same setup that lets Helm delete the uploads PVC in the
section above — only here the volume holds the entire instance database, and a `helm uninstall`, a
rename or a dropped template would have taken it along on a `reclaimPolicy: Delete` StorageClass.

**Action:** none for an upgrade. Note for a deliberate teardown: the claims now survive
`helm uninstall` and have to be removed by hand
(`kubectl -n <namespace> delete pvc <release>-neo4j-data <release>-neo4j-backups`).

`<release>-neo4j-backups` is mounted by no workload — the backup job that used it has not been part
of the chart for a long time. It is kept and protected rather than removed, so that any dumps an
instance still holds survive until the backup story is decided. If you know yours is empty, you can
delete the claim by hand to save the storage.

## Readiness probes for webapp, imagor and maintenance

Only the backend had probes. Without a `readinessProbe` a pod counts as Ready the moment its
container process starts — for Nuxt that is seconds before it listens, so Traefik routed into a 502
for the whole surge window of every webapp rollout. Webapp, imagor, maintenance and Neo4j now have
readiness probes (all `tcpSocket`), and webapp and imagor a `preStop` sleep that covers the gap
between endpoint removal and SIGTERM.

Maintenance is `tcpSocket` like the rest, and must stay that way: the page answers **503** to every
page request on purpose, and kubelet counts only 2xx/3xx as probe success — an `httpGet` on `/`
leaves the pod permanently unready and restarting, and the rollout then silently stalls on the
previous ReplicaSet (see `templates/maintenance/deployment.yaml`).

Neo4j gets **no** liveness probe on purpose: a database busy with recovery or a long GC pause is not
one that should be killed and restarted.

**Action:** none. If your instance keeps its own copy of the chart, port the probes from
`templates/webapp/deployment.yaml`, `templates/imagor/deployment.yaml`,
`templates/maintenance/deployment.yaml` and the neo4j chart's `stateful-set.yaml`.

## ⚠️ Branding: the `public/` bucket is gone — badges move to `assets/badges/`

A branding package used to have a `public/` folder whose contents were copied onto the **backend's**
on-disk `public/` at startup. Every brand used it for exactly one thing: badge icons. That bucket is
removed. Badge icons are ordinary served brand files now — they live in `assets/`, like logos and
fonts, and are read straight from the brand archive by the webapp
(`server-middleware/branding-assets.js`), so nothing is copied into an image any more.

`public/` is **no longer packed into the archive at all**. A brand that still ships one gets a build
warning and its badge icons simply stop existing.

**Action** in your branding package:

1. Move the files:

   ```sh
   git mv branding/public/img/badges branding/assets/badges
   rm -rf branding/public
   ```

2. Repoint the `icon` of every badge in `branding/data/badges-branding.ts` from the old backend path
   to the served brand path — `<id>` is the `brandId` from your `branding/package.json`:

   ```diff
   -    icon: '/img/badges/association_apt.svg',
   +    icon: '/branding/<id>/assets/badges/association_apt.svg',
   ```

3. Rebuild the image and re-run the badge sync so the new URLs reach the database — until you do,
   the DB still holds the old paths and the icons stay broken:

   ```sh
   kubectl exec -n <namespace> deploy/<release>-backend -- npm run prod:db:data:branding
   ```

If you generate your badges with a script, fix the path there too, not just in the generated file.

**Note on overriding FRAMEWORK badge icons:** the old bucket also let a brand replace a core icon
(e.g. `default_verification.svg`) by shadowing the file on the backend's disk. That is no longer
possible — the framework's own badge icons ship with the **webapp** now (see below) and are not
brand-namespaced. Brand badges are unaffected; only overrides of built-in icons are.

## The backend serves no static files any more

`backend/public/` is gone and with it the `express.static` mount. The backend answers GraphQL and the
`/branding/…` archive routes, nothing else. Two things moved:

- **Framework badge icons** → `webapp/static/img/badges/`. The URLs are unchanged
  (`/img/badges/trophy_bear.svg`), they are just served by the webapp instead of proxied to the
  backend, so **no database migration and no action** is required. Existing badge rows keep working.
- **`providers.json`** → `backend/src/graphql/resolvers/embeds/`, where the resolver that uses it
  lives. The settings page reads the list through the new public `embedProviders` query.

**Action:** only if you did one of these:

- You called `https://<domain>/api/providers.json` from your own code — it is gone; use the
  `embedProviders` GraphQL query.
- You put custom files into `backend/public/` in your fork to have them served — that path no longer
  exists. Put them in `webapp/static/` (served at `/`) or, for brand-specific files, into your
  branding's `assets/` (served at `/branding/<id>/assets/…`).

## `/api` is routed to the backend by the ingress, not by the webapp

Browser GraphQL (and the subscription websocket) used to be proxied by the **webapp**: the browser
called `https://<domain>/api/…`, the Nuxt server forwarded it to the backend. The chart now routes
`/api` straight to the backend service at the ingress, with the same `stripPrefix` middleware that
already serves `/imagor`.

Nothing changes for the browser — still the same origin, same URL, same cookie. What changes is that
the request no longer passes through the Nuxt process, which renders pages server-side in a single
event loop. Measured against a local stack (same query, backend answering in ~2 ms regardless): the
proxied call cost +2 ms while the webapp was idle, but **470 ms** at 8 concurrent server-side
renders. Over the ingress it stayed at 10 ms.

**Action:** none if you deploy the chart as shipped. If you maintain your own copy of
`templates/ingress.yaml`, add the `/api` path (and the `/api` prefix on the stripPrefix middleware)
from the chart, or you keep the old behaviour.

Notes:

- The `proxy` block in `webapp/nuxt.config.js` stays and is still what serves `/api` in local
  development, where there is no ingress. In the cluster the request never reaches it.
- Under `underMaintenance: true` the `/api` route is deliberately **not** rendered, so the API goes
  to the maintenance service together with the UI — exactly as before.
- The backend's HTTP surface under `/api/*` is unchanged; it was reachable the same way through the
  proxy. This exposes nothing new.
- Rollback is deleting the `/api` path from the ingress: the webapp proxy then takes over again.
## Network policy: registration & feature flags moved to runtime config

The following flags are now part of the **runtime network policy** (bucket B): they
are served by the backend at runtime, can be changed live by an admin under
**Admin → Network policy** (no redeploy), and are seeded from the **backend** ENV
on first start. They are no longer read from the **webapp** build/ENV.

- `ASK_FOR_REAL_NAME`, `REQUIRE_LOCATION`, `BADGES_ENABLED`, `INVITE_LINK_LIMIT` —
  these used to be **webapp** ENV variables. **Action:** move them to the **backend**
  environment (`.env`, `docker-compose.yml` or `values.yaml`). If you previously set
  e.g. `BADGES_ENABLED=true` on the webapp only, set it on the **backend** now (or
  toggle it in the admin UI), otherwise it falls back to the schema default.
- `MAX_GROUP_PINNED_POSTS`, `API_KEYS_MAX_PER_USER`, `MAX_PINNED_POSTS`,
  `INVITE_CODES_PERSONAL_PER_USER`, `INVITE_CODES_GROUP_PER_USER` — already backend ENV
  variables; no change to where you set them. They are now additionally editable live
  in the admin UI; the backend ENV value is the seed/`reset` default.

Remove `BADGES_ENABLED`, `ASK_FOR_REAL_NAME`, `REQUIRE_LOCATION`, `INVITE_LINK_LIMIT`,
`MAX_GROUP_PINNED_POSTS` and `API_KEYS_MAX_PER_USER` from the **webapp** environment
— the webapp no longer reads them (see `webapp/.env.template`).

### Layout toggles moved from branding constants to the network policy

`SHOW_CONTENT_FILTER_HEADER_MENU`, `SHOW_CONTENT_FILTER_MASONRY_GRID` and
`SHOW_GROUP_BUTTON_IN_HEADER` were **webapp branding constants**
(`branding/constants/filter.{js,ts}` and `groups.{js,ts}`). They are now runtime
network-policy keys (`showContentFilterHeaderMenu`, `showContentFilterMasonryGrid`,
`showGroupButtonInHeader`), live-editable under **Admin → Network policy → Layout**.
**Action:** set them via the **backend** ENV (`SHOW_CONTENT_FILTER_HEADER_MENU` etc.,
defaults `true`/`false`/`true`) or in the admin UI, and drop them from your
`branding/constants/filter` and `groups` — the webapp no longer reads them there
(`webapp/constants/filter.js` was removed; `SHOW_GROUP_BUTTON_IN_HEADER` removed from
`webapp/constants/groups.js`).

## Version >= 3.2.0 with 'ocelotDockerVersionTag' 3.2.0-XXX

### Backend and Kubernetes Config `DBMS_DEFAULT_DATABASE`

- We have the new option to configure the default name of the Neo4j database to be used for operations and commands in environment variables (`.env`, `docker-compose.yml` or `values.yaml`).
For more details see  [deployment-values.md](deployment-values.md):

```yaml
DBMS_DEFAULT_DATABASE: "graph.db"
```

The default value is `neo4j` if it is not set.

### Webapp Config `dateTime`

- You can set `RELATIVE_DATETIME` and `ABSOLUT_DATETIME_FORMAT` in `branding/constants/dateTime.js` originally in main code file `webapp/constants/dateTime.js` to your preferred values.

## Version >= 3.1.0 with 'ocelotDockerVersionTag' 3.1.0-555

- We have the new option to configure DKIM for sent e-mails in environment variables (`.env`, `docker-compose.yml` or `values.yaml`), see [deployment-values.md](deployment-values.md):
  - `SMTP_DKIM_DOMAINNAME=`
  - `SMTP_DKIM_KEYSELECTOR=`
  - `SMTP_DKIM_PRIVATEKEY=`

## Version >= 2.7.0 with 'ocelotDockerVersionTag' 2.7.0-470

- You have to rename all `.js` files  to `.ts` in `branding/constants`

## Version >= 2.4.0 with 'ocelotDockerVersionTag' 2.4.0-298

- You have to set `SHOW_CONTENT_FILTER_HEADER_MENU` and `SHOW_CONTENT_FILTER_MASONRY_GRID` in `branding/constants/filter.js` originally in main code file `webapp/constants/filter.js` to your preferred values.

### Main Code PR –  feat(webapp): map #5843

- Create your own [Mapbox](https://mapbox.com/) account at [https://mapbox.com/](https://mapbox.com/) for your organization to get your own Mapbox token.
- You have to add the `MAPBOX_TOKEN` from the `deployment/kubernetes/values.template.yaml` to your `deployment/kubernetes/values.yaml` and set it to your own Mapbox token.

## Version >= 2.2.0 with 'ocelotDockerVersionTag' 2.2.0-267

### Main Code PR – feat: 🍰 Footer And Header Links Configurable To Have External Link Target #5590

- You have to add property `target` to all array elements with value `url` to your preferred value in `branding/constants/headerMenu.js` originally in main code file `webapp/constants/headerMenu.js`.
- You have to move value of all `externalLink` to new property `externalLink.url` and set new property `externalLink.target` to your preferred value in `branding/constants/links.js` originally in main code file `webapp/constants/links.js`.

### Main Code PR – feat: 🍰 Make Donation Progress Bar Color Configurable #5593

- You have to set `PROGRESS_BAR_COLOR_TYPE` in `branding/constants/donation.js` originally in main code file `webapp/constants/donation.js` to your preferred value.

### Main Code PR – feat: 🍰 Header Logo Routing Update #5579

- You have to move value of `LOGO_HEADER_CLICK.externalLink` to new property `LOGO_HEADER_CLICK.externalLink.url` and set new property `LOGO_HEADER_CLICK.externalLink.target` to your preferred value in `branding/constants/logos.js` originally in main code file `webapp/constants/logos.js`.

## Version >= 2.0.0 with 'ocelotDockerVersionTag' 2.0.0-250

### Main Code PR – feat: 🍰 Implement LOGO_HEADER_CLICK As Configuration #5525

- You have to set `LOGO_HEADER_CLICK` in `branding/constants/logos.js` originally in main code file `webapp/constants/logos.js` to your preferred value.

### Main Code Issue – 🌟 [EPIC] Release v2.0.0 – Beta Test → Final #5547

- You have to set `SHOW_GROUP_BUTTON_IN_HEADER` in `branding/constants/groups.js` originally in main code file `webapp/constants/groups.js` to your preferred value.

## Version >= 1.1.0 with 'ocelotDockerVersionTag' 1.1.0-205

### Deployment/Rebranding PR – chore: 🍰 Release v1.1.0 - Implement Categories Again #63

- You have to add the `CATEGORIES_ACTIVE` from the `deployment/kubernetes/values.template.yaml` to your `deployment/kubernetes/values.yaml` and set it to your preferred value.
- Make sure the correct categories are in your Neo4j database on the server.

## Version >= 1.0.9 with 'ocelotDockerVersionTag' 1.0.9-199

### Deployment/Rebranding PR – chore: 🍰 Implement PRODUCTION_DB_CLEAN_ALLOW for Staging Production Environments #56

- Copy `PRODUCTION_DB_CLEAN_ALLOW` from `deployment/kubernetes/values.template.yaml` to `values.yaml` and set it to `false` for production environments and only for several stage test servers to `true`.

### Deployment/Rebranding PR – chore: [WIP] 🍰 Refine docs, first step #46

Upgrade the cert-manager, but install CRDs of the version 1.0.0-alpha to actually be able to upgrade ocelot. Then uninstall the legacy CRDs and install the correct ones.

```bash
# upgrade cert-manager to 1.9.1
> helm upgrade --set installCRDs=true --version 1.9.1 --namespace cert-manager cert-manager jetstack/cert-manager
# apply legacy CRDs
> kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.0.0-alpha.1/cert-manager.crds.yaml
# upgrade ocelot
> helm upgrade ocelot ./
# delete legacy CRDs
> kubectl delete -f https://github.com/cert-manager/cert-manager/releases/download/v1.0.0-alpha.1/cert-manager.crds.yaml
# apply CRDs for cert-manager 1.9.1
> kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.9.1/cert-manager.crds.yaml
```

Background: We had to upgrade cert-manager due to an external dependency - therefore we had to update cert-manager apiVersion `cert-manager.io/v1alpha2` to `cert-manager.io/v1`.

The error occurring when not doing this is the following:

```bash
Error: UPGRADE FAILED: unable to build kubernetes objects from current release manifest: [resource mapping not found for name: "letsencrypt-production" namespace: "" from "": no matches for kind "ClusterIssuer" in version "cert-manager.io/v1alpha2"
ensure CRDs are installed first, resource mapping not found for name: "letsencrypt-staging" namespace: "" from "": no matches for kind "ClusterIssuer" in version "cert-manager.io/v1alpha2"
ensure CRDs are installed first]
```

## Version >= 1.0.8 with 'ocelotDockerVersionTag' 1.0.8-182

### PR – feat: 🍰 Configure Cookie Expire Time #43

- You have to add the `COOKIE_EXPIRE_TIME` from the `deployment/kubernetes/values.template.yaml` to your `deployment/kubernetes/values.yaml` and set it to your preferred value.
- Correct `locale` cookie exploration time in data privacy.

## Version 1.0.7 with 'ocelotDockerVersionTag' 1.0.7-171

- No information.
