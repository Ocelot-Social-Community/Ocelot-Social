import { merge } from 'lodash'
import headerMenu from '~/constants/headerMenu.js'

const defaultHeaderMenu = {
  CUSTOM_BUTTON: {
    // iconPath: '/img/custom/X',
    // iconWidth: '28px',
    // iconAltText: 'X',
    // toolTipIdent: 'nameIdent',
    // path: '/',
    // url: 'https://ocelot.social/en/donate',
    // target: '_blank',
  },
  MENU: [
    // {
    //   nameIdent: 'nameIdent',
    //   path: '/',
    // },
    // {
    //   nameIdent: 'nameIdent',
    //   url: 'https://ocelot.social',
    //   target: '_blank',
    // },
  ],
}

export default merge(defaultHeaderMenu, headerMenu)
