<template>
  <section class="login-form">
    <blockquote>
      <p>{{ $t('quotes.african.quote') }}</p>
      <b>- {{ $t('quotes.african.author') }}</b>
    </blockquote>
    <base-card>
      <template #imageColumn>
        <a :href="$t('login.moreInfoURL')" :title="$t('login.moreInfo')" target="_blank">
          <img class="image" alt="Human Connection" src="/img/sign-up/humanconnection.svg" />
        </a>
      </template>
      <h2 class="title">{{ $t('login.login') }}</h2>
      <form 
          ref="form"
          :disabled="pending" @submit.prevent="onSubmit" 
          @keydown.caps-lock="capsLock"
          @keyup.caps-lock="capsLock">
        <ds-input
          v-model="form.email"
          :disabled="pending"
          :placeholder="$t('login.email')"
          type="email"
          name="email"
          icon="envelope"
        />
          <ds-input
            v-model="form.password"
            :disabled="pending"
            :placeholder="$t('login.password')"
            icon="lock"
            icon-right="question-circle"
            name="password"
            type="password"
            ref="passwordInput"
          />
        <nuxt-link to="/password-reset/request">
          {{ $t('login.forgotPassword') }}
        </nuxt-link>
        <text class="caps-warning" v-show="caps" >CAPS LOCK ENABLED!</text>
        <base-button :loading="pending" filled name="submit" type="submit" icon="sign-in">
          {{ $t('login.login') }}
        </base-button>
        <p>
          {{ $t('login.no-account') }}
          <nuxt-link to="/registration/signup">{{ $t('login.register') }}</nuxt-link>
        </p>
      </form>
      <template #topMenu>
        <locale-switch offset="5" />
      </template>
    </base-card>
  </section>
</template>

<script>
import LocaleSwitch from '~/components/LocaleSwitch/LocaleSwitch'

export default {
  components: {
    LocaleSwitch,
  },
  data() {
    return {
      form: {
        email: '',
        password: '',
      },
      caps: false,
    }
  },
  computed: {
    pending() {
      return this.$store.getters['auth/pending']
    },
  },
  methods: {
    async onSubmit() {
      const { email, password } = this.form
      try {
        await this.$store.dispatch('auth/login', { email, password })
        this.$toast.success(this.$t('login.success'))
        this.$emit('success')
      } catch (err) {
        this.$toast.error(this.$t('login.failure'))
      }
    },
    capsLock(e){
      if(document.activeElement.name === 'password') {
        this.caps = e.getModifierState('CapsLock')
      }
    }
  },
}
</script>

<style lang="scss">
.login-form {
  width: 80vw;
  max-width: 620px;
  margin: auto;

  .base-button {
    display: block;
    width: 100%;
    margin-top: $space-large;
    margin-bottom: $space-small;
  }
  
  .caps-warning {
    font-size: 12px;
    color: $text-color-danger;
    background-color: $background-color-danger-inverse;
    border: 2px solid $border-color-softer ;
    border-radius: 5px;
    padding: 4px 8px;
    margin-left: 8px;
    

  }
}

</style>
