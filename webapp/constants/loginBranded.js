import { merge } from 'lodash'
import login from '~/constants/login.js'

const defaultLogin = {
  LAYOUT: 'no-header',
}

export default merge(defaultLogin, login)
