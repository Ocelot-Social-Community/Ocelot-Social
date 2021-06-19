<template>
    <ds-card class="legend">
        <div class="legend-container">
            <div class="legend-header">Keyboard shortcuts and markdown code</div>
            <div class="legend-table" v-for="item in legenditems" :key="item.name">
                <base-button size="small" circle :ghost="!isActive" @click="onClick" :icon="item.iconname">
                    <span v-if="item.label">{{ item.label }}</span>
                </base-button>
                <span>{{item.name}}</span>
                <span class="tool-shortcut">{{item.shortcut}}</span>
            </div>
        </div>
    </ds-card>
</template>

<script>
export default {
    data(){
        return {
            legenditems: [
                {iconname:'bold',name:'bold',shortcut:'Ctrl+b'},
                {iconname:'italic',name:'italic',shortcut:'Ctrl+i'},
                {iconname:'underline',name:'underline',shortcut:'Ctrl+u'},
                {iconname:'link',name:'link',shortcut:''},
                {iconname:'paragraph',name:'paragraph',shortcut:''},
                {label:'H3',name:'heading 3',shortcut:'### + space'},
                {label:'H4',name:'heading 4',shortcut:'#### + space'},
                {iconname:'list-ul',name:'unordered list',shortcut:'* + space'},
                {iconname:'list-ol',name:'ordered list',shortcut:'1. + space'},
                {iconname:'quote-right',name:'quote',shortcut:'> + space'},
                {iconname:'minus',name:'ruler',shortcut:'---'},
            ]
        }
    }
}
</script>

<style lang="scss">
.legend{
    z-index: 5;
    position: absolute;
    width: 22rem;
    padding: 0rem;
    border: 1px solid #e5e3e8;
}
.legend-container{
    display: flex;
    flex-direction: column;
}
.legend-header{
    margin-bottom: 0.5em;
}
.legend-table{
    display:grid;
    align-items: center;
    grid-template-columns: 0.5fr 1fr 2fr;
    border-bottom: 0.5px solid grey;
    padding: 0.2em;
}
.tool-shortcut{
  padding-left: 2rem;
}
</style>
