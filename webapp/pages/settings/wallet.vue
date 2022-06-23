<template>
  <base-card>
    <h2 class="title">{{ $t('settings.wallet.walletConnect') }}</h2>
    <div>
        <h3>MetaMask</h3>
        <hr />
        {{metamaskData}}
         <br />
        <vue-metamask ref="metamask" :initConnect="false"></vue-metamask>
        
        
        <base-button @click="connect">connect</base-button>
    </div>
      
     
  </base-card>
</template>

<script>
import VueMetamask from 'vue-metamask';

export default {
    name: 'settings-wallet',
    components: {
        VueMetamask,
    },
    data(){
        return {
            msg: "This is demo net work",
            metamaskData: 'datas',
        }
    },
    methods:{
        connect() {
                this.$refs.metamask.init();
            }
    }
}
</script>
