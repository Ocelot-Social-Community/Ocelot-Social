// configurable values see: 'backend/src/constants/groupsDefault', 'webapp/constants/groupsDefault'
// configurable values see: 'backend/src/constants/groups', 'webapp/constants/groups'

import * as groupsDefault from './groupsDefault'
import * as groupsBranding from '../branding/groupsBranding'

export const { DESCRIPTION_WITHOUT_HTML_LENGTH_MIN, DESCRIPTION_EXCERPT_HTML_LENGTH } = {
  ...groupsDefault,
  ...groupsBranding,
}
