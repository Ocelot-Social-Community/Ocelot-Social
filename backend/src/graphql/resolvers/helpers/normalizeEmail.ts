// Default import, not named: the package is CommonJS and Node derives named exports
// from it by static analysis, which misses these. `import { … }` type-checks and then
// throws at load. The default import is the whole module.exports.
import validator from 'validator'

const { normalizeEmail } = validator

export default (email: string) =>
  normalizeEmail(email, {
    // gmail_remove_dots: true, default
    gmail_remove_subaddress: false,
    // gmail_convert_googlemaildotcom: true, default
    outlookdotcom_remove_subaddress: false,
    yahoo_remove_subaddress: false,
    icloud_remove_subaddress: false,
  })
