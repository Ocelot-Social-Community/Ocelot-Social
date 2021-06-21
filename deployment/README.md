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

- E-mail: admin@example.org
- Password: 1234

***ATTENTION:*** When you are logged in for the first time, please change your (the admin's) e-mail to an existing one and change your password to a secure one !!!
