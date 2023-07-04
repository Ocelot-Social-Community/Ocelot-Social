import { register } from 'vue-advanced-chat'
export default ({ app }) => {
    if(process.client){
        register()
    }
}

