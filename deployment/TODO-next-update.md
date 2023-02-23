# Todo For Next Update

When you overtake this deploy and rebrand repo to your network you have to recognize the following changes and doings:

## Version >= 2.4.0 with 'ocelotDockerVersionTag' 2.4.0-XXX

### Main Code PR –  feat(webapp): map #5843

- Create your own [Mapbox](https://mapbox.com/) account at [https://mapbox.com/](https://mapbox.com/) for your organization to get your own Mapbox token.
- You have to add the `MAPBOX_TOKEN` from the `deployment/kubernetes/values.template.yaml` to your `deployment/kubernetes/values.yaml` and set it to your own Mapbox token.

## Version >= 2.2.0 with 'ocelotDockerVersionTag' 2.2.0-267

### Main Code PR – feat: 🍰 Footer And Header Links Configurable To Have External Link Target #5590

- You have to add property `target` to all array elements with value `url` to your preferred value in `branding/constants/headerMenu.js` originally in main code file `webapp/constants/headerMenu.js`.
- You have to move value of all `externalLink` to new property `externalLink.url` and set new property `externalLink.target` to your preferred value in `branding/constants/links.js` originally in main code file `webapp/constants/links.js`.

### Main Code PR – feat: 🍰 Make Donation Progress Bar Color Configurable #5593

- You have to set `PROGRESS_BAR_COLOR_TYPE` in `branding/constants/donation.js` originally in main code file `webapp/constants/donation.js` to your preferred value.

### Main Code PR – feat: 🍰 Header Logo Routing Update #5579

- You have to move value of `LOGO_HEADER_CLICK.externalLink` to new property `LOGO_HEADER_CLICK.externalLink.url` and set new property `LOGO_HEADER_CLICK.externalLink.target` to your preferred value in `branding/constants/logos.js` originally in main code file `webapp/constants/logos.js`.

## Version >= 2.0.0 with 'ocelotDockerVersionTag' 2.0.0-250

### Main Code PR – feat: 🍰 Implement LOGO_HEADER_CLICK As Configuration #5525

- You have to set `LOGO_HEADER_CLICK` in `branding/constants/logos.js` originally in main code file `webapp/constants/logos.js` to your preferred value.

### Main Code Issue – 🌟 [EPIC] Release v2.0.0 – Beta Test → Final #5547

- You have to set `SHOW_GROUP_BUTTON_IN_HEADER` in `branding/constants/groups.js` originally in main code file `webapp/constants/groups.js` to your preferred value.

## Version >= 1.1.0 with 'ocelotDockerVersionTag' 1.1.0-205

### Deployment/Rebranding PR – chore: 🍰 Release v1.1.0 - Implement Categories Again #63

- You have to add the `CATEGORIES_ACTIVE` from the `deployment/kubernetes/values.template.yaml` to your `deployment/kubernetes/values.yaml` and set it to your preferred value.
- Make sure the correct categories are in your Neo4j database on the server.

## Version >= 1.0.9 with 'ocelotDockerVersionTag' 1.0.9-199

### Deployment/Rebranding PR – chore: 🍰 Implement PRODUCTION_DB_CLEAN_ALLOW for Staging Production Environments #56

- Copy `PRODUCTION_DB_CLEAN_ALLOW` from `deployment/kubernetes/values.template.yaml` to `values.yaml` and set it to `false` for production environments and only for several stage test servers to `true`.

### Deployment/Rebranding PR – chore: [WIP] 🍰 Refine docs, first step #46

Upgrade the cert-manager, but install CRDs of the version 1.0.0-alpha to actually be able to upgrade ocelot. Then uninstall the legacy CRDs and install the correct ones.

```bash
# upgrade cert-manager to 1.9.1
> helm upgrade --set installCRDs=true --version 1.9.1 --namespace cert-manager cert-manager jetstack/cert-manager
# apply legacy CRDs
> kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.0.0-alpha.1/cert-manager.crds.yaml
# upgrade ocelot
> helm upgrade ocelot ./
# delete legacy CRDs
> kubectl delete -f https://github.com/cert-manager/cert-manager/releases/download/v1.0.0-alpha.1/cert-manager.crds.yaml
# apply CRDs for cert-manager 1.9.1
> kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.9.1/cert-manager.crds.yaml
```

Background: We had to upgrade cert-manager due to an external dependency - therefore we had to update cert-manager apiVersion `cert-manager.io/v1alpha2` to `cert-manager.io/v1`.

The error occurring when not doing this is the following:

```bash
Error: UPGRADE FAILED: unable to build kubernetes objects from current release manifest: [resource mapping not found for name: "letsencrypt-production" namespace: "" from "": no matches for kind "ClusterIssuer" in version "cert-manager.io/v1alpha2"
ensure CRDs are installed first, resource mapping not found for name: "letsencrypt-staging" namespace: "" from "": no matches for kind "ClusterIssuer" in version "cert-manager.io/v1alpha2"
ensure CRDs are installed first]
```

## Version >= 1.0.8 with 'ocelotDockerVersionTag' 1.0.8-182

### PR – feat: 🍰 Configure Cookie Expire Time #43

- You have to add the `COOKIE_EXPIRE_TIME` from the `deployment/kubernetes/values.template.yaml` to your `deployment/kubernetes/values.yaml` and set it to your preferred value.
- Correct `locale` cookie exploration time in data privacy.

## Version 1.0.7 with 'ocelotDockerVersionTag' 1.0.7-171

- No information.
