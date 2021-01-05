# ocelot.social \| Deployment Configuration

There are a couple different ways we have tested to deploy an instance of ocelot.social, with [Kubernetes](https://kubernetes.io/) and via [Helm](https://helm.sh/docs/). In order to manage your own
network, you have to [install Kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/), [install Helm](https://helm.sh/docs/intro/install/) (optional, but the preferred way),
and set up a Kubernetes cluster. Since there are many different options to host your cluster, we won't go into specifics here.

We have tested two different Kubernetes providers: [Minikube](./minikube/README.md)
and [Digital Ocean](./digital-ocean/README.md).

Check out the specific documentation for your provider. After that, choose whether you want to go with the recommended deploy option [Helm](./helm/README.md), or use Kubernetes to apply the configuration for [ocelot.social](./ocelot-social/README.md).

## Initialise Database For Production After Deployment

After the first deployment of the new network on your server, the database must be initialized to start your network. This involves setting up a default administrator with the following data:

- E-mail: admin@example.org
- Password: 1234

{% hint style="danger" %}
TODO: When you are logged in for the first time, please change your (the admin's) e-mail to an existing one and change your password to a secure one !!!
{% endhint %}

Run the following command in the Docker container of the or a backend:

{% tabs %}
{% tab title="Kubernetes For Docker" %}

```bash
# with explicit pod backend name
$ kubectl -n ocelot-social exec -it <backend-name> yarn prod:migrate init

# or

# if you have only one backend grep it
$ kubectl -n ocelot-social exec -it $(kubectl -n ocelot-social get pods | grep backend | awk '{ print $1 }') yarn prod:migrate init

# or

# sh in your backend and do the command here
$ kubectl -n ocelot-social exec -it $(kubectl -n ocelot-social get pods | grep backend | awk '{ print $1 }') sh
backend: $ yarn prod:migrate init
backend: $ exit
```

{% endtab %}
{% tab title="Docker-Compose Local" %}

```bash
# exec in backend
$ docker-compose exec backend yarn run db:migrate init
```

{% endtab %}
{% endtabs %}
