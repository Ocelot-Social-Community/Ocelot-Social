# Helm installation of Ocelot.social

Deploying Ocelot.social with Helm is very straight forward. All you have to do is to change certain parameters, like domain names and API keys, then you just install our provided Helm chart to your cluster.

## Configuration

You can customize the network with your configuration by changing the `values.yaml`, all variables will be available as environment variables in your deployed kubernetes pods. For more details refer to the `values.yaml.dist` file.

Besides the `values.yaml.dist` file we provide a `nginx.values.yaml.dist` and `dns.values.yaml.dist`. The `nginx.values.yaml` is the configuration for the ingress-nginx helm chart, while the `dns.values.yaml` file is for automatically updating the dns values on digital ocean and therefore optional.

As hinted above you should copy the given files and rename them accordingly. Then go ahead and modify the values in the newly created files accordingly.

## Installation

Due to the many limitations of Helm you still have to do several manual steps. Those occur before you run the actual ocelot helm chart. Obviously it is expected of you to have `helm` and `kubectl` installed. For Digital Ocean you might require `doctl` aswell.

### Cert Manager (https)

Please refer to [cert-manager.io docs](https://cert-manager.io/docs/installation/kubernetes/) for more details.

1. Create Namespace

```bash
kubectl --kubeconfig=/../kubeconfig.yaml create namespace cert-manager
```

2. Add Helm Repo & update

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update
```

3. Install Cert-Manager Helm chart
```bash
# this can not be included sine the CRDs cant be installed properly via helm...
helm --kubeconfig=/../kubeconfig.yaml \
  install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --version v1.1.0 \
  --set installCRDs=true
```

### Ingress-Nginx

1. Add Helm Repo & update
```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
```

2. Install ingress-nginx
```bash
helm --kubeconfig=/../kubeconfig.yaml install ingress-nginx ingress-nginx/ingress-nginx -f nginx.values.yaml
```

### Digital Ocean Firewall

This is only necessary if you run Digital Ocean without load balancer ([see here for more info](https://stackoverflow.com/questions/54119399/expose-port-80-on-digital-oceans-managed-kubernetes-without-a-load-balancer/55968709)) .

1. Authenticate towards DO with your local `doctl`

You will need a DO token for that.
```bash
doctl auth init
```

2. Generate DO firewall
```bash
doctl compute firewall create \
--inbound-rules="protocol:tcp,ports:80,address:0.0.0.0/0,address:::/0 protocol:tcp,ports:443,address:0.0.0.0/0,address:::/0" \
--tag-names=k8s:1ebf0cdc-86c9-4384-936b-40010b71d049 \
--name=my-domain-http-https
```

### DNS

This chart is only necessary (recommended is more precise) if you run Digital Ocean without load balancer. 
You need to generate a token for the `dns.values.yaml`.

1. Add Helm Repo & update
```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

2. Install DNS
```bash
helm --kubeconfig=/../kubeconfig.yaml install dns bitnami/external-dns -f dns.values.yaml
```

### Ocelot.social

All commands for ocelot need to be executed in the kubernetes folder. Therefore `cd deployment/kubernetes/` is expected to be run before every command. Furthermore the given commands will install ocelot into the default namespace. This can be modified to by attaching `--namespace not.default`.

#### Install
```bash
helm --kubeconfig=/../kubeconfig.yaml install ocelot ./
```

#### Upgrade
```bash
helm --kubeconfig=/../kubeconfig.yaml upgrade ocelot ./
```

#### Uninstall
Be aware that if you uninstall ocelot the formerly bound volumes become unbound. Those volumes contain all data from uploads and database. You have to manually free their reference in order to bind them again when reinstalling. Once unbound from their former container references they should automatically be rebound (considering the sizes did not change)

```bash
helm --kubeconfig=/../kubeconfig.yaml uninstall ocelot
```

## Error reporting

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
Apparently Digital Ocean's kubernetes clusters do not fulfill the requirements.