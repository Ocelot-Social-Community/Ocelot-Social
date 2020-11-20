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
      <form :disabled="pending" @submit.prevent="onSubmit">
        <ds-input
          v-model="form.email"
          :disabled="pending"
          :placeholder="$t('login.email')"
          type="email"
          name="email"
          icon="envelope"
        />
        <div class="password-wrapper">
          <ds-input
            v-model="form.password"
            :disabled="pending"
            :placeholder="$t('login.password')"
            icon="lock"
            name="password"
            :type="showPassword ? 'text' : 'password'"
          />
          <a
            class="click-wrapper"
            @mousedown="(event) => {
                showPassword = !showPassword;
                event.preventDefault();
            }"
          >
            <base-icon 
                class="toggle-icon"
                :name="showPassword ? 'eye-slash' :  'eye'"
            />
          </a>
        </div>
        <nuxt-link to="/password-reset/request">
          {{ $t('login.forgotPassword') }}
        </nuxt-link>
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
import BaseIcon from '../_new/generic/BaseIcon/BaseIcon'

export default {
  components: {
    LocaleSwitch,
    BaseIcon
  },
  data() {
    return {
      form: {
        email: '',
        password: '',
      },
      showPassword: false
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
}

.password-wrapper {
  position: relative;
  display: flex;
  appearance: none;
  width: 100%;
  padding: $input-padding-vertical $space-x-small;
  height: $input-height;

  color: $text-color-base;
  background: $background-color-disabled;

  border: $input-border-size solid $border-color-softer;
  border-radius: $border-radius-base;
  outline: none;
  transition: all $duration-short $ease-out;
  &:focus-within {
    background-color: $background-color-base;
    border: $input-border-size solid $border-color-active;
    .toggle-icon {
      color: $text-color-base;
    }
  }
}
</style>
