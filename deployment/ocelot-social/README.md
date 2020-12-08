# Kubernetes Configuration For ocelot.social

Deploying *ocelot.social* with kubernetes is straight forward. All you have to
do is to change certain parameters, like domain names and API keys, then you
just apply our provided configuration files to your cluster.

## Configuration

Change into the `./deployment` directory and copy our provided templates:

```bash
# in folder deployment/ocelot-social/
$ cp templates/secrets.template.yaml ./secrets.yaml
$ cp templates/configmap.template.yaml ./configmap.yaml
```

Change the `configmap.yaml` in the `./deployment/ocelot-social` directory as needed, all variables will be available as
environment variables in your deployed Kubernetes pods.

Probably you want to change this environment variable to your actual domain:

```yaml
# in configmap.yaml
CLIENT_URI: "https://develop-k8s.ocelot.social"
```

If you want to edit secrets, you have to `base64` encode them. See [Kubernetes Documentation](https://kubernetes.io/docs/concepts/configuration/secret/#creating-a-secret-manually).

```bash
# example how to base64 a string:
$ echo -n 'admin' | base64
YWRtaW4=
```

Those secrets get `base64` decoded and are available as environment variables in
your deployed Kubernetes pods.

## Create A Namespace

```bash
# in folder deployment/
$ kubectl apply -f namespace.yaml
```

If you have a [Kubernets Dashboard](../digital-ocean/dashboard/README.md)
deployed you should switch to namespace `ocelot-social` in order to
monitor the state of your deployments.

## Create Persistent Volumes

While the deployments and services can easily be restored, simply by deleting
and applying the Kubernetes configurations again, certain data is not that
easily recovered. Therefore we separated persistent volumes from deployments
and services. There is a [dedicated section](../volumes/README.md). Create those
persistent volumes once before you apply the configuration.

## Apply The Configuration

Before you apply you should think about the size of the droplet(s) you need.
For example, the requirements for Neo4j v3.5.14 are [here](https://neo4j.com/docs/operations-manual/3.5/installation/requirements/).
Tips to configure the pod resources you find [here](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/).

```bash
# in folder deployment/
$ kubectl apply -f ocelot-social/
```

This can take a while, because Kubernetes will download the Docker images from Docker Hub. Sit
back and relax and have a look into your kubernetes dashboard. Wait until all
pods turn green and they don't show a warning `Waiting: ContainerCreating`
anymore.
