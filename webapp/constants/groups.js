// configurable values see: 'backend/src/constants/groupsDefault', 'webapp/constants/groupsDefault'
// configurable values see: 'backend/src/constants/groups', 'webapp/constants/groups'

import * as groupsDefault from './groupsDefault'
import * as groupsBranding from '../branding/groupsBranding'

export const {
  NAME_LENGTH_MIN,
  NAME_LENGTH_MAX,
  DESCRIPTION_WITHOUT_HTML_LENGTH_MIN,
  SHOW_GROUP_BUTTON_IN_HEADER,
} = { ...groupsDefault, ...groupsBranding }
