# Deployment

Before you start the deployment you have to do preparations.

## Deployment Preparations

Since all deployment methods described here depend on [Docker](https://docker.com) and [DockerHub](https://hub.docker.com), you need to create your own organisation on DockerHub and put its name in the [package.json](/package.json) file as your `dockerOrganisation`.  
Read more details in the [main README](/README.md) under [Usage](/README.md#usage).

## Deployment Methods

You have the following options for a deployment:

- [Kubernetes with Helm](./kubernetes/README.md)

## After Deployment

After the first deployment of the new network on your server, the database is initialized with the default administrator:

- E-mail: `admin@example.org`
- Password: `1234`

***ATTENTION:*** When you are logged in for the first time, please change your (the admin's) e-mail to an existing one and change your password to a secure one !!!

## Use the Scripts

To use all the scripts you have to set the variable `CONFIGURATION` in your terminal by entering:

```bash
# in deployment folder

# set configuration name to folder name in 'configurations' folder (network name)
$ export CONFIGURATION=`<your-configuration-name>`
# to check this
$ echo $CONFIGURATION
```

### Secrets Encrypt/Decrypt

To encrypt and decrypt the secrets of your network in your terminal set a correct password in a (new) file `configurations/<your-configuration-name>/SECRET`.
If done please enter:

```bash
# in deployment folder

# encrypt secrets
$ scripts/secrets.encrypt.sh

# decrypt secrets
$ scripts/secrets.decrypt.sh
```

### Maintenance Mode On/Off

Activate or deactivate maintenance mode in your terminal:

```bash
# in deployment folder

# activate maintenance mode
$ scripts/cluster.maintenance.sh on

# deactivate maintenance mode
$ scripts/cluster.maintenance.sh off
```

### Backup Script

To save a locale backup of the database and uploaded images:

```bash
# in deployment folder

# save backup
$ scripts/cluster.backup.sh
```

The backup will be saved into your network folders `backup` folder in a new folder with the date and time.
