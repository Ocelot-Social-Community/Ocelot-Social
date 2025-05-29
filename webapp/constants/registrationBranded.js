// this file is duplicated in `backend/src/config/registrationBranded.ts` and `webapp/constants/registrationBranded.js`
import { merge } from 'lodash'

import registration from '~/constants/registration.js'

const defaultRegistration = {
  NONCE_LENGTH: 5,
  INVITE_CODE_LENGTH: 6,
  LAYOUT: 'no-header',
}

export default merge(defaultRegistration, registration)
