# `infomaniac`

If you want to set up a [Kubernetes](https://kubernetes.io) cluster on [infomaniac](https://www.infomaniak.com), follow this guide.

## Create Account

Create an account with `infomaniac`.

## Create a Kubernetes Cluster in the Jelastic Cloud Area

XXX On the right top you find the button `Create`. Click on it and choose `Kubernetes - Create Kubernetes Cluster`.

- select `Remote API` (to be installed to become able to manage the cluster from your local terminal)
- select `Kubernetes Dashboard`
- XXX choose your datacenter region
- name your node pool: e.g. `pool-<your-network-name>`
- `2 Basic nodes` with `2.5 GB RAM (total of 4 GB)`, `2 shared CPUs`, and `80 GB Disk` each is optimal for the beginning
- set your cluster name: e.g. `cluster-<your-network-name>`
- select your project
- no tags necessary

Save all the information you get at the and of the process.

## Getting Started

After your cluster is set up you need access to it in your local terminal via `kubectl`.
Please install the following management tools:

- [kubectl v1.28.x](https://kubernetes.io/docs/tasks/tools/)

Install the tools as described on the tab or see the links here.

### In Terminal — Set your Kubernetes Cluster to the Current One

How this works is described on [Virtuozzo PaaS Docs](https://www.virtuozzo.com/application-platform-docs/kubernetes-cluster-access/#kubectl-client).

```bash
kubectl config set-cluster jelastic --server={api-endpoint} && \
kubectl config set-context jelastic --cluster=jelastic && \
kubectl config set-credentials user --token={token} && \
kubectl config set-context jelastic --user=user && \
kubectl config use-context jelastic
```

> Replace the `{api-endpoint}` and `{token}` placeholders with the Remote API URL and access token respectively.

## XXX DNS Configuration

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

## XXX Backups On DigitalOcean

You can and should do [backups](./Backup.md) with Kubernetes for sure.

Additional to backup and copying the Neo4j database dump and the backend images you can do a volume snapshot on DigitalOcean at the moment you have the database in sleep mode.
