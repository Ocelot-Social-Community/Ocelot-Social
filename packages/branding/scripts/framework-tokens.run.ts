// CLI entry for `npm run tokens:snapshot` — regenerates the committed framework-token snapshot. Kept
// separate from framework-tokens.ts (the tested logic) so this trivial runner is not part of the
// coverage-measured code (tests never import it).
import { writeFrameworkTokens } from './framework-tokens.ts'

console.log(`wrote ${writeFrameworkTokens()}`)
