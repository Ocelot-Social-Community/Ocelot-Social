# Deployment

Before you start the deployment you have to do preparations.

## Deployment Preparations

Since all deployment methods described here depend on [Docker](https://docker.com) and [DockerHub](https://hub.docker.com), you need to create your own organisation on DockerHub and put its name in the [package.json](https://github.com/Ocelot-Social-Community/Ocelot-Social/blob/master/package.json) file as your `dockerOrganisation`.  
Read more details in the [main README](https://github.com/Ocelot-Social-Community/Ocelot-Social/blob/master/README.md) under [Usage](https://github.com/Ocelot-Social-Community/Ocelot-Social/blob/master/README.md#usage).

## Deployment Methods

You have the following options for a deployment:

- [Kubernetes with Helm](./src/kubernetes/README.md)

## After Deployment

After the first deployment of the new network on your server, the database is initialized with the default administrator:

- E-mail: `admin@example.org`
- Password: `1234`

***ATTENTION:*** When you are logged in for the first time, please change your (the admin's) e-mail to an existing one and change your password to a secure one !!!

## Using the Scripts

To use most of the scripts you have to set the variable `CONFIGURATION` in your terminal by entering:

```bash
# in deployment folder

# set configuration name to folder name in 'configurations' folder (network name)
$ export CONFIGURATION=<your-configuration-name>
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

### Backup Scripts

Save backups.

#### Single Backup

To save a local backup of the database and uploaded images:

```bash
# in deployment folder

# save backup
$ scripts/cluster.backup.sh
```

The backup will be saved into your network folders `backup` folder in a new folder with the date and time.

#### Multiple Networks Backup

In order to save several network backups locally, you must define the configuration names of all networks in `.env`. The template for this is `deployment/.env.dist`:

```bash
# in the deployment folders '.env' set as example
BACKUP_CONFIGURATIONS="stage.ocelot.social stage.wir.social"
BACKUP_SAVED_BACKUPS_NUMBER=7
```

If `BACKUP_SAVED_BACKUPS_NUMBER <= 0` then no backups will be deleted.

To actually save all the backups run:

```bash
# in deployment folder

# save all backups listed in 'BACKUP_CONFIGURATIONS'
# delete all backups older then the 'BACKUP_SAVED_BACKUPS_NUMBER' newest ones
$ scripts/clusters.backup-multiple-servers.sh
```

The backups will be saved into your networks folders `backup` folder in a new folder with the date and time.

#### Automated Backups

⚠️ *Attention: Please check carefully whether really the oldest backups have been deleted. As shells on different systems behave differently with regard to the commands used in this script.*

Install automated backups by a [cron job](https://en.wikipedia.org/wiki/Cron).
Be aware of having the bash shell installed to run the script.
The environment variables for the automated backups are described above.

Installing a cron job by editing the cron table file:

```bash
# edit cron job table
$ crontab -e
```

In the editor add the line:

```bash
# in cron job table file

# set a cron job every night at 04am server time
# min   hour    day     month   weekday command
00      04      *       *       *       /root/Ocelot-Social/deployment/scripts/clusters.backup-multiple-servers.sh >> /root/Ocelot-Social/deployment/backup-cron-job.log
```

This way the terminal output is written into a log file named `backup-cron-job.log` located in the deployment folder.

Be aware that the server datetime can differ from your local time.
Especially by the change between summer and winter time, because servers usually have UTC.
Find out the actual difference by running the command `date` on your server.
