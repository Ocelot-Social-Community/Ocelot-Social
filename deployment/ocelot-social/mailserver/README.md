# Production Docker Mail Server

You can deploy a production [docker-mailserver](https://tvi.al/simple-mail-server-with-docker/) ([on GitHub](https://github.com/tomav/docker-mailserver)) to manage all send and received mails and displays them in a web interface.

The [ocelot.social sample configuration](../templates/configmap.template.yaml) is assuming a mail server in the `SMTP_HOST` configuration and can point to a cluster-internal SMTP server as well as to an external.
Acknowledge that this is the configuration for the *ocelot.social* network and *not* the one for your *docker-mailserver*.

The [docker-mailserver sample configuration](./templates/docker-mailserver-configmap.template.yaml) is separate and contains all the *docker-mailserver* env's. Please copy it and change it to your needs:

```bash
# in folder deployment/ocelot-social/mailserver/
XXX $ cp templates/docker-mailserver-secrets.template.yaml ./docker-mailserver-secrets.yaml
$ cp templates/docker-mailserver-configmap.template.yaml ./docker-mailserver-configmap.yaml
```

To deploy the *docker-mailserver* just uncomment the relevant code in the
[ingress server configuration](../../digital-ocean/https/templates/ingress.template.yaml) and
run the following:

```bash
# in folder deployment/ocelot-social/
$ kubectl apply -f mailserver/
```

You might need to refresh the TLS secret to enable HTTPS on the publicly available web interface.
