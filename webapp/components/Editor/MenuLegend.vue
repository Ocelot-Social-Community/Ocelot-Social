<template>
    <ds-card class="legend">
        <div class="legend-container">
            <div class="legend-header">Keyboard shortcuts and markdown code</div>
            <div class="legend-table" v-for="item in legenditems" :key="item.name">
                <base-button size="small" circle :ghost="!isActive" @click="onClick" :icon="item.iconname">
                    <span v-if="item.label">{{ item.label }}</span>
                </base-button>
                <span>{{item.name}}</span>
                <span>{{item.shortcut}}</span>
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
    z-index: 1;
    position: absolute;
    width: 400px;
    top: 0;
    right:0;
    padding: 0.5em;
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
    grid-template-columns: 1fr 1fr 1fr;
    border-bottom: 0.5px solid grey;
    padding: 0.2em;
}
</style>