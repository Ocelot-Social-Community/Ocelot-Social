<template>
    <div>_id groupe page 
        <div>{{$route.params}}</div>
         <nuxt-link :to="{ name: 'group-create' }">
         bearbeiten
            <ds-icon name="ellipsis-v"></ds-icon>
          </nuxt-link>
    </div>
</template>