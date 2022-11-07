<template>
  <section class="login-form">
    <blockquote>
      <p>{{ $t('quotes.african.quote') }}</p>
      <b>- {{ $t('quotes.african.author') }}</b>
    </blockquote>
    <base-card>
      <template #imageColumn>
        <page-params-link :pageParams="links.ORGANIZATION" :title="$t('login.moreInfo', metadata)">
          <logo logoType="welcome" />
        </page-params-link>
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
            class="password-field"
            ref="password"
            :type="showPassword ? 'text' : 'password'"
          />
          <show-password @show-password="toggleShowPassword" :iconName="iconName" />
        </div>
        <nuxt-link to="/password-reset/request">
          {{ $t('login.forgotPassword') }}
        </nuxt-link>
        <base-button :loading="pending" filled name="submit" type="submit" icon="sign-in">
          {{ $t('login.login') }}
        </base-button>
        <p>
          {{ $t('login.no-account') }}
          <nuxt-link to="/registration">{{ $t('login.register') }}</nuxt-link>
        </p>
      </form>
      <template #topMenu>
        <locale-switch offset="5" />
      </template>
    </base-card>
  </section>
</template>

<script>
import links from '~/constants/links.js'
import metadata from '~/constants/metadata.js'
import PageParamsLink from '~/components/_new/features/PageParamsLink/PageParamsLink.vue'
import LocaleSwitch from '~/components/LocaleSwitch/LocaleSwitch'
import Logo from '~/components/Logo/Logo'
import ShowPassword from '../ShowPassword/ShowPassword.vue'
import { mapGetters, mapMutations } from 'vuex'

export default {
  components: {
    LocaleSwitch,
    Logo,
    PageParamsLink,
    ShowPassword,
  },
  data() {
    return {
      metadata,
      links,
      form: {
        email: '',
        password: '',
      },
      showPassword: false,
    }
  },
  computed: {
    pending() {
      return this.$store.getters['auth/pending']
    },
    iconName() {
      return this.showPassword ? 'eye-slash' : 'eye'
    },
    ...mapGetters({
      currentUser: 'auth/user',
    }),
  },
  methods: {
    ...mapMutations({
      toggleCategory: 'posts/TOGGLE_CATEGORY',
      resetCategories: 'posts/RESET_CATEGORIES',
    }),
    async onSubmit() {
      const { email, password } = this.form
      try {
        await this.$store.dispatch('auth/login', { email, password })
        if (this.currentUser && this.currentUser.activeCategories) {
          this.resetCategories()
          if (this.currentUser.activeCategories.length > 0) {
            this.currentUser.activeCategories.forEach((categoryId) => {
              this.toggleCategory(categoryId)
            })
          }
        }
        this.$toast.success(this.$t('login.success'))
        this.$emit('success')
      } catch (err) {
        if (err.message === 'Error: no-cookie') {
          this.$toast.error(this.$t('login.no-cookie'))
        } else {
          this.$toast.error(this.$t('login.failure'))
        }
      }
    },
    toggleShowPassword() {
      this.showPassword = !this.showPassword
      this.$nextTick(() => {
        this.$refs.password.$el.children[1].children[1].focus()
        this.$emit('focus')
      })
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
  display: flex;
  width: 100%;
  align-items: center;
  padding: $input-padding-vertical $space-x-small;
  padding-left: 0;
  padding-right: 0;
  height: $input-height;
  margin-bottom: 10px;

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

  .password-field {
    position: relative;
    padding-top: 16px;
    border: none;
    border-style: none;
    appearance: none;
    margin-left: 0;
    width: 100%;
  }
}
</style>
