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

## Getting Started

After your cluster is set up – see progress bar above – click on `Getting started`. Please install the following management tools:

- [kubectl v1.24.1](https://kubernetes.io/docs/tasks/tools/)
- [doctl v1.78.0](https://github.com/digitalocean/doctl)

Install the tools as described on the tab or see the links here.

After the installation, click on `Continue`.

### Download Configuration File

Follow the steps to download the configuration file.

You can skip this step if necessary, as you can download the file later. You can then do this by clicking on `Kubernetes` in the left menu. In the menu to the right of the cluster name in the cluster list, click on `More` and select `Download Config`.

### Patch & Minor Version Upgrades

Skip `Patch & Minor Version Upgrades` for now.

### Install 1-Click Apps

You don't need a 1-click app. Our helmet script will install the required NGINXs.
Therefore, skip this step as well.

For a 1-click Kubernetes Dashboard, follow the next step.

## Install Kubernetes Dashboard

We recommend installing a Kubernetes Dashboard, as DigitalOcean no longer offers a pre-installed dashboard.

- 1-click-deployment of [Kubernetes Dashboard on DigitalOcean marketplace](https://marketplace.digitalocean.com/apps/kubernetes-dashboard)

There you will also find a section entitled `Getting Started`, which describes how you can log in from your local computer.

Very short description:

### In your DigitalOcean Account

For authentication, download the current cluster configuration file from DigitalOcean.

### In Terminal

Set the context of the cluster by command:

```bash
$ kubectl config use-context <context-name>
```

Port-forward the Kubernetes Dashboard to your local machine:

```bash
# save pod name
$ export POD_NAME=$(kubectl get pods -n kubernetes-dashboard -l "app.kubernetes.io/name=kubernetes-dashboard,app.kubernetes.io/instance=kubernetes-dashboard" -o jsonpath="{.items[0].metadata.name}")
# forward port
$ kubectl -n kubernetes-dashboard port-forward $POD_NAME 8443:8443
```

### Log-In to Kubernetes Dashboard

Access the URL in your local web browser at <https://127.0.0.1:8443/>, and log in using your Kubernetes cluster credentials – downloaded config file. You may encounter a certificate warning, so make sure to override it.

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
DigitalOcean is not a domain registrar, but provides a DNS management service. If you use DigitalOcean's DNS management service, you can configure [your cluster](./README.md#dns) to always resolve the domain to the correct IP and automatically update it for that.
The IPs of the DigitalOcean machines are not necessarily stable, so the cluster's DNS service will update the DNS records managed by DigitalOcean to the new IP as needed.

***CAUTION:** If you are using an external DNS, you currently have to do this manually, which can cause downtime.*

## Deploy

Yeah, you're done here. Back to [Deployment with Helm for Kubernetes](./README.md).

## Backups On DigitalOcean

You can and should do [backups](./Backup.md) with Kubernetes for sure.

Additional to backup and copying the Neo4j database dump and the backend images you can do a volume snapshot on DigitalOcean at the moment you have the database in sleep mode.
