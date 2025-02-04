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

### Set your Kubernetes Cluster to the Current One

If you have received the credentials from `infomaniak` via the modal dialog or e-mail after provisioning the cluster, use them to access your Kubernetes cluster.

#### In Terminal

How this works is described on [Virtuozzo PaaS Docs](https://www.virtuozzo.com/application-platform-docs/kubernetes-cluster-access/#kubectl-client).

```bash
kubectl config set-cluster jelastic --server={api-endpoint} && \
kubectl config set-context jelastic --cluster=jelastic && \
kubectl config set-credentials user --token={token} && \
kubectl config set-context jelastic --user=user && \
kubectl config use-context jelastic
```

> Replace the `{api-endpoint}` and `{token}` placeholders with the Remote API URL and access token respectively.

#### By a `kubeconfig` File

Create a kubeconfig file by replacing `{api-endpoint}` and `{token}`.
Then place it in your clusters configuration folder.

```yaml
apiVersion: v1
clusters:
- cluster:
    server: {api-endpoint}
  name: jelastic
contexts:
- context:
    cluster: jelastic
    user: user
  name: jelastic
current-context: jelastic
kind: Config
preferences: {}
users:
- name: user
  user:
    token: {token}
```

How this files work is described here: <https://kubernetes.io/docs/tasks/access-application-cluster/configure-access-multiple-clusters/>

## Deploy

Yeah, you're done here. Back to [Deployment with Helm for Kubernetes](./README.md).

## Backups On `infomaniak`

You can and should do [backups](./Backup.md) with Kubernetes for sure.

Additional to backup and copying the Neo4j database dump and the backend images you may do a volume snapshot on `infomaniak` at the moment you have the database in sleep mode.
