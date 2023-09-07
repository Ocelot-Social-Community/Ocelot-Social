# Deployment Values

For each deployment, you need to set the environment variables and configurations.
Here is some specific information on how to set the values.

## E-Mails

You need to set environment variables to send registration and invitation information or notifications to users, for example.

### SPF and DKIM

More and more e-mail providers require settings for authorization and verification of e-mail senders.

### SPF

Sometimes it is enough to create an SPF record in your DNS.

### DKIM

However, if you need DKIM authorization and verification, you must set the appropriate environment variables:

```bash
SMTP_DKIM_DOMAINNAME=<your e-mail sender domain>
SMTP_DKIM_KEYSELECTOR=2017
SMTP_DKIM_PRIVATKEY="-----BEGIN RSA PRIVATE KEY-----\n<your base64 encoded privat key data>\n-----END RSA PRIVATE KEY-----\n"
```

You can find out how DKIM works here:

<https://www.ionos.com/digitalguide/e-mail/e-mail-security/dkim-domainkeys/>

To create the private and public DKIM key, see here:

<https://knowledge.ondmarc.redsift.com/en/articles/2141592-generating-2048-bits-dkim-public-and-private-keys-using-openssl-on-a-mac>

Information about the required PEM format can be found here:

<https://docs.progress.com/bundle/datadirect-hybrid-data-pipeline-installation-46/page/PEM-file-format.html>
