// CLI entry for `npm run schema:snapshot` — regenerates the committed schema-shape lock. Kept separate
// from schema-snapshot.ts (the tested logic) so this trivial, in-process-uncoverable runner is not part
// of the coverage-measured code (tests never import it).
import { writeSnapshot } from './schema-snapshot.ts'

console.log(`wrote ${writeSnapshot()}`)
