<template>
  <transition name="fade" appear>
    <post-detail />
  </transition>
</template>

<script>
import PostDetail from '~/components/PostDetail/PostDetail.vue'

export default {
  name: 'EventSlug',
  transition: {
    name: 'slide-up',
    mode: 'out-in',
  },
  components: {
    PostDetail
  },
  mixins: [],
  head() {
    
  },
  data() {
    return {      
    }
  },
  mounted() {
    
  },
  computed: {
    
  },
  methods: {
    
  },
  apollo: {
    
  },
}
</script>
<style lang="scss">

</style>
