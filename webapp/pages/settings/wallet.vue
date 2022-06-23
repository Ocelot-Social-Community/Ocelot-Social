<template>
  <base-card>
    <h2 class="title">{{ $t('settings.wallet.walletConnect') }}</h2>
    <div>
      <h3>MetaMask</h3>
      <hr />
      <div v-for="value in data" :key="value">{{value}}</div>
      <br />
      <vue-metamask ref="metamask" :initConnect="false"  @onComplete="onComplete"></vue-metamask>

      <base-button @click="connect">connect</base-button>
    </div>
  </base-card>
</template>

<script>
import VueMetamask from 'vue-metamask'

export default {
  name: 'settings-wallet',
  components: {
    VueMetamask,
  },
  data() {
    return {
      msg: 'This is demo net work',
      data: {
        message: null,
        metaMaskAddress: null,
        netID: null,
        type: null,
      },
    }
  },
  methods: {
    connect() {
      this.$refs.metamask.init()
      // console.log('connect:', this.$refs.metamask.init())
    },
    onComplete(data) {
        console.log('data:', data)
        this.data.message = data['message']
        this.data.metaMaskAddress = data['metaMaskAddress']
        this.data.netID = data['netID']
        this.data.type = data['type']
    }
  },
}
</script>
