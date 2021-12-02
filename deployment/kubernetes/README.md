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

## Installation

Due to the many limitations of Helm you still have to do several manual steps. Those occur before you run the actual *ocelot.social* Helm chart. Obviously it is expected of you to have `helm` and `kubectl` installed. For DigitalOcean you might require `doctl` aswell.

### Cert Manager (https)

Please refer to [cert-manager.io docs](https://cert-manager.io/docs/installation/kubernetes/) for more details.

***ATTENTION:*** *Be with the Terminal in your repository in the folder of this README.*

#### 1. Create Namespace

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
  --version v1.1.0 \
  --set installCRDs=true
# or kubeconfig.yaml in your repo, then adjust
$ helm --kubeconfig=/../kubeconfig.yaml \
  install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --version v1.1.0 \
  --set installCRDs=true
```

### Ingress-Nginx

#### 1. Add Helm repository and update

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

Fill in the `CLUSTER_UUID` and `your-domain`:

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

#### 1. Add Helm repository and update

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

Run for all upgrades and updates:

```bash
# kubeconfig.yaml set globaly
$ helm upgrade ocelot ./
# or kubeconfig.yaml in your repo, then adjust
$ helm --kubeconfig=/../kubeconfig.yaml upgrade ocelot ./
```

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

## Backups

You can and should do [backups](/deployment/kubernetes/Backup.md) with Kubernetes for sure.

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
