<template>
  <section class="login-form">
    <base-card>
      <template #imageColumn>
        <a :href="links.ORGANIZATION" :title="$t('login.moreInfo', metadata)" target="_blank">
          <img class="image" alt="Welcome" src="/img/custom/welcome.svg" />
        </a>
      </template>
      <h1 class="title">{{ $t('components.registration.signup.title', metadata) }}</h1>
      <component-slider>
        <registration-item-create-user-account />
        <!-- <registration-item-create-user-account /> -->
        <base-button
          style="float: right"
          icon="check"
          type="submit"
          filled
          :loading="false"
          :disabled="false"
        >
          Test!!!
        </base-button>
      </component-slider>
      <!-- <form :disabled="pending" @submit.prevent="onSubmit">
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
          <span class="click-wrapper" @click="toggleShowPassword">
            <span class="icon-wrapper" :data-test="iconName">
              <base-icon class="toggle-icon" :name="iconName" />
            </span>
          </span>
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
      </form> -->
      <template #topMenu>
        <locale-switch offset="5" />
      </template>
    </base-card>
  </section>
</template>

<script>
import LocaleSwitch from '~/components/LocaleSwitch/LocaleSwitch'
import ComponentSlider from '~/components/ComponentSlider/ComponentSlider'
import RegistrationItemCreateUserAccount from './RegistrationItemCreateUserAccount'
import links from '~/constants/links.js'
import metadata from '~/constants/metadata.js'

export default {
  name: 'RegistrationSlider',
  components: {
    LocaleSwitch,
    ComponentSlider,
    RegistrationItemCreateUserAccount,
  },
  // props: {
  //   id: { type: String },
  //   loading: { type: Boolean, default: false },
  //   options: { type: Array, default: () => [] },
  // },
  data() {
    return {
      links,
      metadata,
      // searchValue: '',
      // value: '',
      // unprocessedSearchInput: '',
      // searchProcess: null,
      // previousSearchTerm: '',
      // delay: 300,
    }
  },
  computed: {
    // emptyText() {
    //   return this.isActive && !this.loading ? this.$t('search.failed') : this.$t('search.hint')
    // },
    // isActive() {
    //   return !isEmpty(this.previousSearchTerm)
    // },
  },
  methods: {
    // isFirstOfType(option) {
    //   return (
    //     this.options.findIndex((o) => o === option) ===
    //     this.options.findIndex((o) => o.__typename === option.__typename)
    //   )
    // },
    // onFocus(event) {
    //   clearTimeout(this.searchProcess)
    // },
    // handleInput(event) {
    //   clearTimeout(this.searchProcess)
    //   this.value = event.target ? event.target.value.replace(/\s+/g, ' ').trim() : ''
    //   this.unprocessedSearchInput = this.value
    //   if (isEmpty(this.value) || this.value.replace(/\s+/g, '').length < 3) {
    //     return
    //   }
    //   this.searchProcess = setTimeout(() => {
    //     this.previousSearchTerm = this.value
    //     this.$emit('query', this.value)
    //   }, this.delay)
    // },
    // /**
    //  * TODO: on enter we should go to a dedicated search page!?
    //  */
    // onEnter(event) {
    //   clearTimeout(this.searchProcess)
    //   if (!this.loading) {
    //     this.previousSearchTerm = this.unprocessedSearchInput
    //     this.$emit('query', this.unprocessedSearchInput)
    //   }
    // },
    // onDelete(event) {
    //   clearTimeout(this.searchProcess)
    //   const value = event.target ? event.target.value.trim() : ''
    //   if (isEmpty(value)) {
    //     this.clear()
    //   } else {
    //     this.handleInput(event)
    //   }
    // },
    // clear() {
    //   this.unprocessedSearchInput = ''
    //   this.previousSearchTerm = ''
    //   this.searchValue = ''
    //   this.$emit('clearSearch')
    //   clearTimeout(this.searchProcess)
    // },
    // onBlur(event) {
    //   this.searchValue = this.previousSearchTerm
    //   clearTimeout(this.searchProcess)
    // },
    // onSelect(item) {
    //   this.goToResource(item)
    //   this.$nextTick(() => {
    //     this.searchValue = this.previousSearchTerm
    //   })
    // },
    // isPost(item) {
    //   return item.__typename === 'Post'
    // },
    // isTag(item) {
    //   return item.__typename === 'Tag'
    // },
    // goToResource(item) {
    //   this.$nextTick(() => {
    //     if (!this.isTag(item)) {
    //       this.$router.push({
    //         name: this.isPost(item) ? 'post-id-slug' : 'profile-id-slug',
    //         params: { id: item.id, slug: item.slug },
    //       })
    //     } else {
    //       this.$router.push('?hashtag=' + item.id)
    //     }
    //   })
    // },
  },
}
</script>

<style lang="scss">
// .searchable-input {
//   position: relative;
//   display: flex;
//   align-items: center;
//   width: 100%;

//   .ds-form-item {
//     flex-basis: 100%;
//     margin-bottom: 0;
//   }

//   .ds-select-dropdown {
//     max-height: 70vh;
//     box-shadow: $box-shadow-x-large;
//   }

//   .option-with-heading {
//     margin-top: $space-x-small;
//     padding-top: $space-xx-small;
//   }

//   .base-button {
//     position: absolute;
//     right: $space-xx-small;
//   }
// }
</style>
