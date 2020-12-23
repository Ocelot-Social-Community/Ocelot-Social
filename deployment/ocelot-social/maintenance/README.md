# Maintenance mode

> Despite our best efforts, systems sometimes require downtime for a variety of reasons. 

Quote from [here](https://www.nrmitchi.com/2017/11/easy-maintenance-mode-in-kubernetes/)

We use our maintenance mode for manual database backup and restore. Also we
bring the database into maintenance mode for manual database migrations.

## Deploy the service

We prepared sample configuration, so you can simply run:

```sh
# in folder deployment/
$ kubectl apply -f ./ocelot-social/maintenance/
```

This will fire up a maintenance service.

## Bring application into maintenance mode

Now if you want to have a controlled downtime and you want to bring your
application into maintenance mode, you can edit your global ingress server.

E.g. copy file [`deployment/digital-ocean/https/templates/ingress.template.yaml`](../../digital-ocean/https/templates/ingress.template.yaml) to new file `deployment/digital-ocean/https/ingress.yaml` and change the following:

```yaml
...

  - host: develop-k8s.ocelot.social
    http:
      paths:
      - path: /
        backend:
          # serviceName: web
          serviceName: maintenance
          # servicePort: 3000
          servicePort: 80
```

Then run `$ kubectl apply -f deployment/digital-ocean/https/ingress.yaml`. If you
want to deactivate the maintenance server, just undo the edit and apply the
configuration again.

