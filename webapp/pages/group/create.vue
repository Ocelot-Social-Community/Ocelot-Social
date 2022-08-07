<template>
  <div>
    <h2>Neue Gruppe</h2>

    <new-group-form style="padding-top: 30px" />
  </div>
</template>

<script>
import NewGroupForm from '~/components/GroupForm/GroupForm'

export default {
  components: {
    NewGroupForm,
  },
}
</script>
