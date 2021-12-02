# Kubernetes Backup Of Ocelot.Social

One of the most important tasks in managing a running [ocelot.social](https://github.com/Ocelot-Social-Community/Ocelot-Social) network is backing up the data, e.g. the Neo4j database and the stored image files.

## Manual Offline Backup

To prepare, [kubectl](https://kubernetes.io/docs/tasks/tools/) must be installed and ready to use so that you have access to Kubernetes on your server.

Check if the correct context is used by running the following commands:

```bash
# check context and set the correct one
$ kubectl config get-contexts
# if the wrong context is chosen use it
$ kubectl config use-context <your-context>
# if you like check additionally if all pods are running well
$ kubectl -n default get pods -o wide
```

The very first step is to put the webside into **maintenance mode**.

### Set Maintenance Mode

There are two ways to put the network into maintenance mode:

- via Kubernetes Dashboard
- via `kubectl`

#### Maintenance Mode Via Kubernetes Dashboard

In the Kubernetes Dashboard, you can select `Ingresses` from the left side menu under `Service`.

After that, in the list that appears, you will find the entry `ingress-ocelot-webapp`, which has three dots on the right, where you can click to edit the entry.

You can scroll to the end of the YAML file, where you will find one or more `host` entries under `rules`, one for each domain of the network.

In all entries, change the value of the `serviceName` entry from ***ocelot-webapp*** to `ocelot-maintenance` and the value of the `servicePort` entry from ***3000*** to `80`.

First, check if your website is still online.
After you click `Update`, the new settings will be applied and you will find your website in maintenance mode.

#### Maintenance Mode Via `kubectl`

To put the network into maintenance mode, run the following commands in the terminal:

```bash
# list ingresses
$ kubectl get ingress -n default
# edit ingress
$ kubectl -n default edit ingress ingress-ocelot-webapp
```

Change the content of the YAML file for all domains to:

```yaml
  spec:
    rules:
    - host: network-domain.social
      http:
        paths:
        - backend:
          # serviceName: ocelot-webapp
          # servicePort: 3000
          serviceName: ocelot-maintenance
          servicePort: 80
```

First, check if your website is still online.
After you save the file, the new settings will be applied and you will find your website in maintenance mode.

### Neo4j Database Offline Backup

Before we can back up the database, we need to put it into **sleep mode**.

#### Set Neo4j To Sleep Mode

Again there are two ways to put the network into sleep mode:

- via Kubernetes Dashboard
- via `kubectl`

##### Sleep Mode Via Kubernetes Dashboard

In the Kubernetes Dashboard, you can select `Deployments` from the left side menu under `Workloads`.

After that, in the list that appears, you will find the entry `ocelot-neo4j`, which has three dots on the right, where you can click to edit the entry.

Scroll to the end of the YAML file where you will find the `spec.template.spec.containers` entry. Here you can insert the `command` entry directly after `imagePullPolicy` in a new line.

```yaml
          terminationMessagePath: /dev/termination-log
          terminationMessagePolicy: File
          imagePullPolicy: Always
          command: ["tail", "-f", "/dev/null"]
```

After clicking `Update`, the new settings will be applied and you should check in the `Pods` menu item on the left side if the `ocelot-neo4j-<ID>` pod restarts.

##### Sleep Mode Via `kubectl`

To put Neo4j into sleep mode, run the following commands in the terminal:

```bash
# list deployments
$ kubectl get deployments -n default
# edit deployment
$ kubectl -n default edit deployment ocelot-neo4j
```

Scroll to the `spec.template.spec.containers` entry. Here you can insert the `command` entry directly after `imagePullPolicy` in a new line.

```yaml
          image: <network-DockerHub-name>/neo4j-community-branded:latest
          imagePullPolicy: Always
          command: ["tail", "-f", "/dev/null"]
```

After pressing enter, the new settings will be applied and you should check if the `ocelot-neo4j-<ID>` pod restarts.
Use command:

```bash
# check if the old pod restarts
$ kubectl -n default get pods -o wide
```

#### Generate Offline Backup

The offline backup is generated via `kubectl`:

```bash
# check for the Neo4j pod
$ kubectl -n default get pods -o wide

# ls: see wish backup dumps are already there
$ kubectl -n default exec -it $(kubectl -n default get pods | grep ocelot-neo4j | awk '{ print $1 }') -- ls

# bash: enter bash of Neo4j
$ kubectl -n default exec -it $(kubectl -n default get pods | grep ocelot-neo4j | awk '{ print $1 }') -- bash
# generate Dump
neo4j% neo4j-admin dump --to=/var/lib/neo4j/$(date +%F)-neo4j-dump
# exit bash
neo4j% exit

# ls: see if the new backup dump is there
$ kubectl -n default exec -it $(kubectl -n default get pods | grep ocelot-neo4j | awk '{ print $1 }') -- ls
```

Lets copy the dump backup

```bash
# copy dump onto backup volume direct
$ kubectl cp default/$(kubectl -n default get pods | grep ocelot-neo4j |awk '{ print $1 }'):/var/lib/neo4j/$(date +%F)-neo4j-dump /Volumes/<volume-name>/$(date +%F)-neo4j-dump

```

#### Remove Sleep Mode From Neo4j

Again there are two ways to put the network into working mode:

- via Kubernetes Dashboard
- via `kubectl`

##### Remove Sleep Mode Via Kubernetes Dashboard

In the Kubernetes Dashboard, you can select `Deployments` from the left side menu under `Workloads`.

After that, in the list that appears, you will find the entry `ocelot-neo4j`, which has three dots on the right, where you can click to edit the entry.

Scroll to the `spec.template.spec.containers.command` entry and remove the whole `command` entry like:

```yaml
      containers:
        - name: container-ocelot-neo4j
          image: 'senderfm/neo4j-community-branded:latest'
          command:
            - tail
            - '-f'
            - /dev/null
          ports:
            - containerPort: 7687
              protocol: TCP
```

And get:

```yaml
      containers:
        - name: container-ocelot-neo4j
          image: 'senderfm/neo4j-community-branded:latest'
          ports:
            - containerPort: 7687
              protocol: TCP
```

After clicking `Update`, the new settings will be applied and you should check in the `Pods` menu item on the left side if the `ocelot-neo4j-<ID>` pod restarts.

##### Remove Sleep Mode Via `kubectl`

To put Neo4j into working mode, run the following commands in the terminal:

```bash
# list deployments
$ kubectl get deployments -n default
# edit deployment
$ kubectl -n default edit deployment ocelot-neo4j
```

Scroll to the `spec.template.spec.containers.command` entry and remove the whole `command` entry like:

```yaml
    spec:
      containers:
      - command:
        - tail
        - -f
        - /dev/null
        envFrom:
        - configMapRef:
            name: configmap-ocelot-neo4j
```

And get:

```yaml
    spec:
      containers:
      - envFrom:
        - configMapRef:
            name: configmap-ocelot-neo4j
```

After pressing enter, the new settings will be applied and you should check if the `ocelot-neo4j-<ID>` pod restarts.
Use command:

```bash
# check if the old pod restarts
$ kubectl -n default get pods -o wide
```

### Backend Backup

To back up the images from the backend volume, run commands:

```bash
# ls: backend/public/uploads
$ kubectl -n default exec -it $(kubectl -n default get pods | grep ocelot-backend | awk '{ print $1 }') -- ls public/uploads

# copy all images from upload to backup volume direct
$ kubectl cp default/$(kubectl -n default get pods | grep ocelot-backend |awk '{ print $1 }'):/app/public/uploads /Volumes/<volume-name>/$(date +%F)-public-uploads
```

### Remove Maintenance Mode

There are two ways to put the network into working mode:

- via Kubernetes Dashboard
- via `kubectl`

#### Remove Maintenance Mode Via Kubernetes Dashboard

In the Kubernetes Dashboard, you can select `Ingresses` from the left side menu under `Service`.

After that, in the list that appears, you will find the entry `ingress-ocelot-webapp`, which has three dots on the right, where you can click to edit the entry.

You can scroll to the end of the YAML file, where you will find one or more `host` entries under `rules`, one for each domain of the network.

In all entries, change the value of the `serviceName` entry from ***ocelot-maintenance*** to `ocelot-webapp` and the value of the `servicePort` entry from ***80*** to `3000`.

First, check if your website is still in maintenance mode.
After you click `Update`, the new settings will be applied and you will find your website online again.

#### Remove Maintenance Mode Via `kubectl`

To put the network into working mode, run the following commands in the terminal:

```bash
# list ingresses
$ kubectl get ingress -n default
# edit ingress
$ kubectl -n default edit ingress ingress-ocelot-webapp
```

Change the content of the YAML file for all domains to:

```yaml
  spec:
    rules:
    - host: network-domain.social
      http:
        paths:
        - backend:
          serviceName: ocelot-webapp
          servicePort: 3000
          # serviceName: ocelot-maintenance
          # servicePort: 80
```

First, check if your website is still in maintenance mode.
After you save the file, the new settings will be applied and you will find your website online again.

XXX

```bash
# Dump: Create a Backup in Kubernetes: https://docs.human-connection.org/human-connection/deployment/volumes/neo4j-offline-backup#create-a-backup-in-kubernetes
```
