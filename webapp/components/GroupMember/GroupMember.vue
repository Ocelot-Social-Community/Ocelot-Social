<template>
    <div>
         <div><ds-space><h3>Link zur Gruppe</h3></ds-space>
             <ds-space>
    <ds-copy-field>Copy Link for Invite Member please!</ds-copy-field>
    </ds-space>
  </div>
  <br />
  <hr />
  <br />
  <ds-space><h3>Members</h3></ds-space>
        <ds-table :data="tableData" :fields="tableFields">
        <template slot="avatar" >
        <ds-avatar online size="small" name="Hans Peter"></ds-avatar>
      </template>
      <template slot="loves" slot-scope="scope">
        {{ scope.row.name }} loves {{ scope.row.loves }}
      </template>
      <template slot="edit" slot-scope="scope">
        <ds-button
          size="small"
          @click="deleteRow(scope.row)">delete</ds-button>
      </template>
    </ds-table>
    </div>
</template>
<script>
export default {
   name: 'GroupMember',
    data() {
      return {
        tableFields: ['avatar', 'name', 'type', 'loves', 'edit'],
        tableData: [
          {
            name: 'Rengar',
            type: 'Jungler',
            loves: 'Hide and seek'
          },
          {
            name: 'Renekton',
            type: 'Toplaner',
            loves: 'Slice and dice'
          },
          {
            name: 'Twitch',
            type: 'ADC',
            loves: 'Spray and pray'
          },
          {
            name: 'Blitz',
            type: 'Support',
            loves: 'Hook you up'
          }
        ]
      }
    },
    methods: {
      deleteRow(row) {
        const index = this.tableData.indexOf(row)
        if (index > -1) {
          this.tableData.splice(index, 1)
        }
      }
    }  
    
}
</script>
