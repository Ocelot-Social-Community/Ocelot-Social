# Ocelot.Social Deployment And Rebranding

The `deployment` directory is about how to change the look and feel of ocelot.social (called branding) and how to get the software running on a kubernetes cluster (deployment).

## Live demo

__Try out our deployed [development environment](https://stage.ocelot.social).__

This environment is the vanilla ocelot without branding and with seed data.

### Logins

| email | password | role |
| :--- | :--- | :--- |
| `user@example.org` | 1234 | user |
| `moderator@example.org` | 1234 | moderator |
| `admin@example.org` | 1234 | admin |

## Software requirements

- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [helm](https://helm.sh/docs/intro/install/)

Depending on your Kubernetes providers you deploy on:
| Cluster | Type | Tool |
| DigitalOcean | Cloud Hosting | [doctl](https://docs.digitalocean.com/reference/doctl/how-to/install/) |
| Minicube | Local Deployment | [Minikube](https://kubernetes.io/docs/tasks/tools/install-minikube/) |

If you're just getting started, Minikube is a tool that you can use to get your feet wet.

## Usage

The following tasks can be achieved with the tools contained in this directory:

### Start branded docker environment locally

For the developers we offer a `docker compose` in this directory.

1. Copy `.env.dist` and rename it to `.env`
2. (optional) change the `CONFIGURATION` in the `.env` value according to your desired brand. By default its `example`
3. Run `docker-compose up`

This will start the ocelot services within docker in the selected branded version.

If you stop the `docker compose`, change the value of `CONFIGURATION` in the `.env` and restart with `docker compose up` the branded version will change.

Note: this might require `export DOCKER_BUILDKIT=0` to be set in order to have docker-compose build correctly.

### Install a cluster

TODO

### Upgrade a cluster

To upgrade a cluster set the selected brand
`export CONFIGURATION=yourbrand`
then run
`./scripts/cluster.upgrade.sh`

### Toggle cluster maintenance mode

To set a cluster in maintenance mode set the selected brand
`export CONFIGURATION=yourbrand`
then run
`./scripts/cluster.maintenance.sh on`
and respective
`./scripts/cluster.maintenance.sh off`

### Backup cluster data

To backup the data of a cluster set the selected brand
`export CONFIGURATION=yourbrand`
then run
`./scripts/cluster.backup.sh`

This will set the cluster in maintenance-mode, shutdown the database, run the backup, then start the database again and remove maintenance-mode.

### Build branded images

To build branded images set the following environment variables:
```
export CONFIGURATION=yourbrand
export DOCKERHUB_ORGANISATION=yourdockerhub
```

then run
`./scripts/braded-images.build.sh`

For more environment variable options see the script itself.

### Upload branded images

To upload branded images to your dockerhub account you must have built the images and set the following environment variables:
```
export DOCKERHUB_ORGANISATION=yourdockerhub
```

## Configuration and branding

Since all deployment methods described here depend on [Docker](https://docker.com) and [DockerHub](https://hub.docker.com). You need to create your own organization on DockerHub.


TODO: define branding structure
TODO: external branding repo
TODO: encrypted external branding secrets
TODO: no brand deployment

### After deployment

After the first deployment of the new network on your server, the database is initialized with the default administrator:

- E-mail: admin@example.org
- Password: 1234

***ATTENTION:*** When you are logged in for the first time, please change your (the admin's) e-mail to an existing one and change your password to a secure one !!!




TODO: remove

# Configure And Branding

In this folder you will find all configuration files and logo images to customise the configuration and branding of the [ocelot.social](https://github.com/Ocelot-Social-Community/Ocelot-Social) network code to your own needs.

Please change these and they will be used automatically as part of the [deployment](/deployment/README.md) process.

### Push Changes To GitHub

Before merging these changes into the "master" branch on your GitHub fork repository, you need to configure the GitHub repository secrets.  This is necessary to [publish](/.github/workflows/publish.yml) the Docker images by pushing them via GitHub actions to repositories belonging to your DockerHub organisation.

First, go to your DockerHub profile under `Account Settings` and click on the `Security` tab. There you create an access token called `<your-organisation>-access-token` and copy the token to a safe place.

Secondly, in your GitHub repository, click on the 'Settings' tab and go to the 'Secrets' tab.  There you create two secrets by clicking on `New repository secret`:

1. Named `DOCKERHUB_TOKEN` with the newly created DockerHub token (only the code, not the token name).
2. Named `DOCKERHUB_USERNAME` with your DockerHub username.

### Optional: Locally Testing Your DockerHub Images

Just in case you like to check your pushed Docker images in your organisation's DockerHub repositories locally:

- rename the file `docker-compose.ocelotsocial-branded.yml` with your network name
- in the file, rename the ocelot.social DockerHub organisation `ocelotsocialnetwork` to your organisations name

Remove any local Docker images if necessary and do the following:

```bash
# in main folder
$ docker-compose -f docker-compose.<your-organisation>-branded.yml up
# fill the database with an initial admin
$ docker-compose exec backend yarn run prod:migrate init
```

See the login details and browser addresses above.


# Kubernetes Helm Installation Of Ocelot.Social

Deploying [ocelot.social](https://github.com/Ocelot-Social-Community/Ocelot-Social) with [Helm](https://helm.sh) for [Kubernetes](https://kubernetes.io) is very straight forward. All you have to do is to change certain parameters, like domain names and API keys, then you just install our provided Helm chart to your cluster.

## Kubernetes Cloud Hosting

There are various ways to set up your own or a managed Kubernetes cluster. We will extend the following lists over time.  
Please contact us if you are interested in options not listed below.

Managed Kubernetes:

- [DigitalOcean](/deployment/kubernetes/DigitalOcean.md)

## Configuration

You can customize the network server with your configuration by duplicate the `values.template.yaml` to a new `values.yaml` file and change it to your need. All included variables will be available as environment variables in your deployed kubernetes pods.

Besides the `values.template.yaml` file we provide a `nginx.values.template.yaml` and `dns.values.template.yaml` for a similar procedure. The new `nginx.values.yaml` is the configuration for the ingress-nginx Helm chart, while the `dns.values.yaml` file is for automatically updating the dns values on DigitalOcean and therefore optional.

### Cert Manager (https)

Please refer to [cert-manager.io docs](https://cert-manager.io/docs/installation/) for more details.

***ATTENTION:*** *Be with the Terminal in your repository in the folder of this README.*

We have three ways to install the cert-manager, purely via `kubectl`, via `cmctl`, or with `helm`.

We recommend using `helm` because then we do not mix the installation methods.
Please have a look here:

- [Installing with Helm](https://cert-manager.io/docs/installation/helm/#installing-with-helm)

Our Helm installation is optimized for cert-manager version `v1.9.1` and `kubectl` version `"v1.24.2`.

Please search here for cert-manager versions that are compatible with your `kubectl` version on the cluster and on the client: [cert-manager Supported Releases](https://cert-manager.io/docs/installation/supported-releases/#supported-releases).

***ATTENTION:*** *When uninstalling cert-manager, be sure to use the same method as for installation! Otherwise, we could end up in a broken state, see [Uninstall](https://cert-manager.io/docs/installation/kubectl/#uninstalling).*

<!-- #### 1. Create Namespace

```bash
# kubeconfig.yaml set globaly
$ kubectl create namespace cert-manager
# or kubeconfig.yaml in your repo, then adjust
$ kubectl --kubeconfig=/../kubeconfig.yaml create namespace cert-manager
```

#### 2. Add Helm repository and update

```bash
$ helm repo add jetstack https://charts.jetstack.io
$ helm repo update
```

#### 3. Install Cert-Manager Helm chart

```bash
# option 1
# this can't be applied via kubectl to our cluster since the CRDs can't be installed properly this way ...
# $ kubectl apply -f https://github.com/jetstack/cert-manager/releases/download/v1.3.1/cert-manager.crds.yaml

# option 2
# kubeconfig.yaml set globaly
$ helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --version v1.9.1 \
  --set installCRDs=true
# or kubeconfig.yaml in your repo, then adjust
$ helm --kubeconfig=/../kubeconfig.yaml \
  install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --version v1.9.1 \
  --set installCRDs=true
``` -->

### Ingress-Nginx

#### 1. Add Helm repository for `ingress-nginx` and update

```bash
$ helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
$ helm repo update
```

#### 2. Install ingress-nginx

```bash
# kubeconfig.yaml set globaly
$ helm install ingress-nginx ingress-nginx/ingress-nginx -f nginx.values.yaml
# or kubeconfig.yaml in your repo, then adjust
$ helm --kubeconfig=/../kubeconfig.yaml install ingress-nginx ingress-nginx/ingress-nginx -f nginx.values.yaml
```

### DigitalOcean Firewall

This is only necessary if you run DigitalOcean without load balancer ([see here for more info](https://stackoverflow.com/questions/54119399/expose-port-80-on-digital-oceans-managed-kubernetes-without-a-load-balancer/55968709)) .

#### 1. Authenticate towards DO with your local `doctl`

You will need a DO token for that.

```bash
# without doctl context
$ doctl auth init
# with doctl new context to be filled in
$ doctl auth init --context <new-context-name>
```

You will need an API token, which you can generate in the control panel at <https://cloud.digitalocean.com/account/api/tokens> .

#### 2. Generate DO firewall

 Get the `CLUSTER_UUID` value from the dashboard or from the ID column via `doctl kubernetes cluster list`:

```bash
# need to apply access token by `doctl auth init` before
$ doctl kubernetes cluster list
```

Fill in the `CLUSTER_UUID` and `your-domain`. The latter with hyphens `-` instead of dots `.`:

```bash
# without doctl context
$ doctl compute firewall create \
--inbound-rules="protocol:tcp,ports:80,address:0.0.0.0/0,address:::/0 protocol:tcp,ports:443,address:0.0.0.0/0,address:::/0" \
--tag-names=k8s:<CLUSTER_UUID> \
--name=<your-domain>-http-https
# with doctl context to be filled in
$ doctl compute firewall create \
--inbound-rules="protocol:tcp,ports:80,address:0.0.0.0/0,address:::/0 protocol:tcp,ports:443,address:0.0.0.0/0,address:::/0" \
--tag-names=k8s:<CLUSTER_UUID> \
--name=<your-domain>-http-https --context <context-name>
```

To get informations about your success use this command. (Fill in the `ID` you got at creation.):

```bash
# without doctl context
$ doctl compute firewall get <ID>
# with doctl context to be filled in
$ doctl compute firewall get <ID> --context <context-name>
```

### DNS

***TODO:** I thought this is necessary if we use the DigitalOcean DNS management service? See [Manage DNS With DigitalOcean](/deployment/kubernetes/DigitalOcean.md#manage-dns-with-digitalocean)*

This chart is only necessary (recommended is more precise) if you run DigitalOcean without load balancer.
You need to generate an access token with read + write for the `dns.values.yaml` at <https://cloud.digitalocean.com/account/api/tokens> and fill it in.

#### 1. Add Helm repository for `binami` and update

```bash
$ helm repo add bitnami https://charts.bitnami.com/bitnami
$ helm repo update
```

#### 2. Install DNS

```bash
# kubeconfig.yaml set globaly
$ helm install dns bitnami/external-dns -f dns.values.yaml
# or kubeconfig.yaml in your repo, then adjust
$ helm --kubeconfig=/../kubeconfig.yaml install dns bitnami/external-dns -f dns.values.yaml
```

### Ocelot.Social

***Attention:** Before installing your own ocelot.social network, you need to create a DockerHub (account and) organization, put its name in the `package.json` file, and push your deployment and rebranding code to GitHub so that GitHub Actions can push your Docker images to DockerHub. This is because Kubernetes will pull these images to create PODs from them.*

All commands for ocelot need to be executed in the kubernetes folder. Therefore `cd deployment/kubernetes/` is expected to be run before every command. Furthermore the given commands will install ocelot into the default namespace. This can be modified to by attaching `--namespace not.default`.

#### Install

Only run once for the first time of installation:

```bash
# kubeconfig.yaml set globaly
$ helm install ocelot ./
# or kubeconfig.yaml in your repo, then adjust
$ helm --kubeconfig=/../kubeconfig.yaml install ocelot ./
```

#### Upgrade & Update

#### Rollback

Run for a rollback, in case something went wrong:

```bash
# kubeconfig.yaml set globaly
$ helm rollback ocelot
# or kubeconfig.yaml in your repo, then adjust
$ helm --kubeconfig=/../kubeconfig.yaml rollback ocelot
```

#### Uninstall

Be aware that if you uninstall ocelot the formerly bound volumes become unbound. Those volumes contain all data from uploads and database. You have to manually free their reference in order to bind them again when reinstalling. Once unbound from their former container references they should automatically be rebound (considering the sizes did not change)

```bash
# kubeconfig.yaml set globaly
$ helm uninstall ocelot
# or kubeconfig.yaml in your repo, then adjust
$ helm --kubeconfig=/../kubeconfig.yaml uninstall ocelot
```

## Error Reporting

We use [Sentry](https://github.com/getsentry/sentry) for error reporting in both
our backend and web frontend. You can either use a hosted or a self-hosted
instance. Just set the two `DSN` in your
[configmap](../templates/configmap.template.yaml) and update the `COMMIT`
during a deployment with your commit or the version of your release.

### Self-hosted Sentry

For data privacy it is recommended to set up your own instance of sentry. 
If you are lucky enough to have a kubernetes cluster with the required hardware
support, try this [helm chart](https://github.com/helm/charts/tree/master/stable/sentry).

On our kubernetes cluster we get "mult-attach" errors for persistent volumes.
Apparently DigitalOcean's kubernetes clusters do not fulfill the requirements.

## Kubernetes Commands (Without Helm) To Deploy New Docker Images To A Kubernetes Cluster

### Deploy A Version

```bash
# !!! be aware of the correct kube context !!!
$ kubectl config get-contexts

# deploy version '$BUILD_VERSION'
# !!! 'latest' is not recommended on production !!!

# for easyness set env
$ export BUILD_VERSION=1.0.8-48-ocelot.social1.0.8-184 # example
# check this with
$ echo $BUILD_VERSION
1.0.8-48-ocelot.social1.0.8-184

# deploy actual version '$BUILD_VERSION' to Kubernetes cluster
$ kubectl -n default set image deployment/ocelot-webapp container-ocelot-webapp=ocelotsocialnetwork/webapp:$BUILD_VERSION
$ kubectl -n default rollout restart deployment/ocelot-webapp
$ kubectl -n default set image deployment/ocelot-backend container-ocelot-backend=ocelotsocialnetwork/backend:$BUILD_VERSION
$ kubectl -n default rollout restart deployment/ocelot-backend
$ kubectl -n default set image deployment/ocelot-maintenance container-ocelot-maintenance=ocelotsocialnetwork/maintenance:$BUILD_VERSION
$ kubectl -n default rollout restart deployment/ocelot-maintenance
$ kubectl -n default set image deployment/ocelot-neo4j container-ocelot-neo4j=ocelotsocialnetwork/neo4j-community:$BUILD_VERSION
$ kubectl -n default rollout restart deployment/ocelot-neo4j
# verify deployment and wait for the pods of each deployment to get ready for cleaning and seeding of the database
$ kubectl -n default rollout status deployment/ocelot-webapp --timeout=240s
$ kubectl -n default rollout status deployment/ocelot-maintenance --timeout=240s
$ kubectl -n default rollout status deployment/ocelot-backend --timeout=240s
$ kubectl -n default rollout status deployment/ocelot-neo4j --timeout=240s
```

### Staging – Clean And Seed Neo4j Database

***ATTENTION:*** Cleaning and seeding of our Neo4j database is only possible in production if env `PRODUCTION_DB_CLEAN_ALLOW=true` is set in our deployment.

```bash
# !!! be aware of the correct kube context !!!
$ kubectl config get-contexts

# reset and seed Neo4j database via backend for staging
$ kubectl -n default exec -it $(kubectl -n default get pods | grep ocelot-backend | awk '{ print $1 }') -- /bin/sh -c "node --experimental-repl-await dist/db/clean.js && node --experimental-repl-await dist/db/seed.js"


```


# DigitalOcean

If you want to set up a [Kubernetes](https://kubernetes.io) cluster on [DigitalOcean](https://www.digitalocean.com), follow this guide.

## Create Account

Create an account with DigitalOcean.

## Add Project

On the left side you will see a menu. Click on `New Project`. Enter a name and click `Create Project`.  
Skip moving resources, probably.

## Create Kubernetes Cluster

On the right top you find the button `Create`. Click on it and choose `Kubernetes - Create Kubernetes Cluster`.

- use the latest Kubernetes version
- choose your datacenter region
- name your node pool: e.g. `pool-<your-network-name>`
- `2 Basic nodes` with `2.5 GB RAM (total of 4 GB)`, `2 shared CPUs`, and `80 GB Disk` each is optimal for the beginning
- set your cluster name: e.g. `cluster-<your-network-name>`
- select your project
- no tags necessary

### Download Configuration File

Follow the steps to download the configuration file.

You can skip this step if necessary, as you can download the file later. You can then do this by clicking on `Kubernetes` in the left menu. In the menu to the right of the cluster name in the cluster list, click on `More` and select `Download Config`.

### Patch & Minor Version Upgrades

Skip `Patch & Minor Version Upgrades` for now.

## DNS Configuration

There are the following two ways to set up the DNS.

### Manage DNS With A Different Domain Provider

If you have registered your domain or subdomain with another domain provider, add an `A` record there with one of the IP addresses from one of the cluster droplets in the DNS.

To find the correct IP address to set in the DNS `A` record, click `Droplets` in the left main menu.
A list of all your droplets will be displayed.
Take one of the IPs of perhaps two or more droplets in your cluster from the list and enter it into the `A` record.

### Manage DNS With DigitalOcean

***TODO:** How to configure the DigitalOcean DNS management service …*

To understand what makes sense to do when managing your DNS with DigitalOcean, you need to know how DNS works:

DNS means `Domain Name System`. It resolves domains like `example.com` into an IP like `123.123.123.123`.
DigitalOcean is not a domain registrar, but provides a DNS management service. If you use DigitalOcean's DNS management service, you can configure [your cluster](/deployment/kubernetes/README.md#dns) to always resolve the domain to the correct IP and automatically update it for that.  
The IPs of the DigitalOcean machines are not necessarily stable, so the cluster's DNS service will update the DNS records managed by DigitalOcean to the new IP as needed.

***CAUTION:** If you are using an external DNS, you currently have to do this manually, which can cause downtime.*

## Deploy

Yeah, you're done here. Back to [Deployment with Helm for Kubernetes](/deployment/kubernetes/README.md).

## Backups On DigitalOcean

You can and should do [backups](/deployment/kubernetes/Backup.md) with Kubernetes for sure.

Additional to backup and copying the Neo4j database dump and the backend images you can do a volume snapshot on DigitalOcean at the moment you have the database in sleep mode.
