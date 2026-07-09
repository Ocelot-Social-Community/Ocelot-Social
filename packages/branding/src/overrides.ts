// THE single brand override slot for the framework's OWN default build (vanilla). Empty → pure
// defaults. External brands do NOT edit this; they author their own `defineBranding({ … })` in a
// brand repo and compile it to an output artifact that is injected at deploy time (see the
// branding-build step / docu/branding-architecture-konzept.md). This slot exists so ocelot's own
// webapp/backend resolve to vanilla out of the box.

import type { BrandingOverrides } from './schema'

export const overrides: BrandingOverrides = {}
