import Vue from 'vue'
import Styleguide from '@@/system.umd.min.js'
import '@@/system.css'
// Load UI library CSS after styleguide to ensure correct specificity
import '@ocelot-social/ui/style.css'

Vue.use(Styleguide)
