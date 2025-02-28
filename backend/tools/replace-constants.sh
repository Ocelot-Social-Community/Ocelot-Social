#!/bin/bash

# TODO: this is a hack, we should find a better way to share files between backend and webapp
[ -f src/config/tmp/emails.js ] && mv src/config/tmp/emails.js src/config/emails.ts
[ -f src/config/tmp/logos.js ] && mv src/config/tmp/logos.js src/config/logos.ts
[ -f src/config/tmp/metadata.js ] && mv src/config/tmp/metadata.js src/config/metadata.ts
exit 0
