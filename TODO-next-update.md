# Todo For Next Update

When you overtake this deploy and rebrand repo to your network you have to recognize the following changes and doings …

## This Latest Version >= 2.0.0 with 'ocelotDockerVersionTag' 2.0.0-250

### Main Code PR – feat: 🍰 Implement LOGO_HEADER_CLICK As Configuration #5525

- You have to set `LOGO_HEADER_CLICK` in `branding/constants/logos.js` originally in main code file `webapp/constants/logos.js` to your prevered value.

### Main Code Issue – 🌟 [EPIC] Release v2.0.0 – Beta Test → Final #5547

- You have to set `SHOW_GROUP_BUTTON_IN_HEADER` in `branding/constants/groups.js` originally in main code file `webapp/constants/groups.js` to your prevered value.

## This Latest Version >= 1.1.0 with 'ocelotDockerVersionTag' 1.1.0-205

### Deployment/Rebranding PR – chore: 🍰 Release v1.1.0 - Implement Categories Again #63

- You have to add the `CATEGORIES_ACTIVE` from the `deployment/kubernetes/values.template.yaml` to your `deployment/kubernetes/values.yaml` and set it to your preferred value.
- Make sure the correct categories are in your Neo4j database on the server.

## Version >= 1.0.9 with 'ocelotDockerVersionTag' 1.0.9-199

### Deployment/Rebranding PR – chore: 🍰 Implement PRODUCTION_DB_CLEAN_ALLOW for Staging Production Environments #56

- Copy `PRODUCTION_DB_CLEAN_ALLOW` from `deployment/kubernetes/values.template.yaml` to `values.yaml` and set it to `false` for production envireonments and only for several stage test servers to `true`.

### Deployment/Rebranding PR – chore: [WIP] 🍰 Refine docs, first step #46

- Commit: `Update cert-manager apiVersion "cert-manager.io/v1alpha2" to "cert-manager.io/v1"
  - Check for `kubectl` and `helm` versions.

## Version >= 1.0.8 with 'ocelotDockerVersionTag' 1.0.8-182

### PR – feat: 🍰 Configure Cookie Expire Time #43

- You have to add the `COOKIE_EXPIRE_TIME` from the `deployment/kubernetes/values.template.yaml` to your `deployment/kubernetes/values.yaml` and set it to your prevered value.
- Correct `locale` cookie exploration time in data privacy.

## Version 1.0.7 with 'ocelotDockerVersionTag' 1.0.7-171

- No informations.
