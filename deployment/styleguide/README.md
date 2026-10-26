# Styleguide Deployment

You can use the webhook template `webhook.conf.template` and the `deploy-styleguide.sh` script in `deployment/styleguide/` for an automatic deployment from a (github) webhook.

Each run builds the styleguide into `<DEPLOY_DIR>-<git sha>` and swaps the `<DEPLOY_DIR>` symlink over to it atomically. The script

- aborts on the first failing step (`git pull`, `npm ci`, `npm run build`) and leaves the live release untouched,
- publishes a release only once it is complete (`index.html` present), so a broken build can no longer leave an empty, `403`-answering directory live,
- removes leftovers of an aborted run by itself, so a redeploy needs no manual cleanup,
- never runs twice at once (`flock` on `<DEPLOY_DIR>.lock`): a webhook arriving during a run makes that run deploy once more afterwards,
- skips the build when nothing below `styleguide/` changed since the live release (`FORCE=1` builds anyway),
- keeps the newest `KEEP_RELEASES` releases (default `3`, the live one included) and deletes older ones.

For this to work follow these steps (using alpine):

Setup webhook service
```sh
apk add webhook
cp deployment/styleguide/hooks.json.template deployment/styleguide/hooks.json
vi deployment/styleguide/hooks.json
# adjust content of .github/webhooks/hooks.json
# replace all variables accordingly

# copy webhook service file
cp deployment/styleguide/webhook.template /etc/init.d/webhook
vi /etc/init.d/webhook
# adjust content of /etc/init.d/webhook
chmod +x /etc/init.d/webhook

service webhook start
rc-update add webhook boot
```

Setup nginx
```sh
vi /etc/nginx/http.d/default.conf

# contents of /etc/nginx/http.d/default.conf
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /var/www/localhost/htdocs;

    # The github payload is quite big sometimes, hence  those two lines can prevent an reoccurring error message on nginx
    client_body_buffer_size     10M;
    client_max_body_size        10M;

    location / {
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /hooks/ {
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   X-Forwarded-For $remote_addr;
        proxy_set_header   X-Real-IP  $remote_addr;
        proxy_set_header   Host $host;

        proxy_pass         http://127.0.0.1:9000/hooks/;
        proxy_redirect     off;
    }
}
# contents of /etc/nginx/http.d/default.conf

service nginx reload

# delete htdocs/ folder to allow creation of symlink
# (the script refuses to run while it is a real directory)
rm -r /var/www/localhost/htdocs
```

To deploy by hand, run the script as the webhook does, e.g. `deployment/styleguide/deploy-styleguide.sh /var/www/localhost/htdocs`.

For the github webhook configure the following:

| Field                                                | Value                                         |
|------------------------------------------------------|-----------------------------------------------|
| Payload URL                                          | https://styleguide.ocelot.social/hooks/github |
| Content type                                         | application/json                              |
| Secret                                               | A SECRET                                      |
| SSL verification                                     | Enable SSL verification                       |
| Which events would you like to trigger this webhook? | Send me everything.                           |
| Active                                               | [x]                                           |