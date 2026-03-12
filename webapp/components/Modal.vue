<template>
  <div class="modal-wrapper">
    <report-modal
      v-if="open === 'report'"
      :id="data.resource.id"
      :type="data.type"
      :name="name"
      @close="close"
    />
    <confirm-modal
      v-if="open === 'confirm'"
      :id="data.resource.id"
      :type="data.type"
      :name="name"
      :modalData="data.modalData"
      @close="close"
    />
    <delete-user-modal v-if="open === 'delete'" :userdata="data.userdata" @close="close" />
  </div>
</template>

<script>
import ConfirmModal from '~/components/Modal/ConfirmModal'
import ReportModal from '~/components/Modal/ReportModal'
import DeleteUserModal from '~/components/Modal/DeleteUserModal.vue'
import { mapGetters } from 'vuex'

export default {
  name: 'Modal',
  components: {
    ReportModal,
    ConfirmModal,
    DeleteUserModal,
  },
  computed: {
    ...mapGetters({
      data: 'modal/data',
      open: 'modal/open',
    }),
    name() {
      if (!this.data || !this.data.resource) return ''
      const {
        resource: { name, title, author },
      } = this.data
      switch (this.data.type) {
        case 'user':
          return name
        case 'contribution':
          return title
        case 'comment':
          return author && author.name
        default:
          return null
      }
    },
  },
  methods: {
    close() {
      this.$store.commit('modal/SET_OPEN', {})
    },
  },
}
</script>
