<template>
<div>
     <ds-container class="group-list">
         <ds-space><h2>Group List</h2></ds-space>
           <ds-table :data="items" :fields="fields">
      <template slot="loves" slot-scope="scope">
        {{ scope.row.name }} loves {{ scope.row.loves }}
      </template>
      <template slot="edit" slot-scope="scope">
        <ds-button
          size="small"
          @click="deleteRow(scope.row)">delete</ds-button>
      </template>
    </ds-table>
     </ds-container>
</div>
</template>
<script lang="ts">

export default {
    name: 'GroupList',
    props: {
        items: { type: Array, default: () => [] },
        fields: { type: Array, default: () => [] }
    }
}
</script>
