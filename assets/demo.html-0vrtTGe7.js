import{_ as n}from"./plugin-vue_export-helper-DlAUqK2U.js";import{c as a,a as i,o as e}from"./app-CuUP4fus.js";const l={};function p(d,s){return e(),a("div",null,s[0]||(s[0]=[i(`<h2 id="basic-usage" tabindex="-1"><a class="header-anchor" href="#basic-usage"><span>Basic usage</span></a></h2><p>Display an array of route objects.</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>&lt;template&gt;</span></span>
<span class="line"><span>  &lt;ds-flex gutter=&quot;base&quot;&gt;</span></span>
<span class="line"><span>    &lt;ds-flex-item&gt;</span></span>
<span class="line"><span>      &lt;ds-menu :routes=&quot;routes&quot;&gt;</span></span>
<span class="line"><span>      &lt;/ds-menu&gt;</span></span>
<span class="line"><span>    &lt;/ds-flex-item&gt;</span></span>
<span class="line"><span>    &lt;ds-flex-item&gt;</span></span>
<span class="line"><span>      &lt;ds-menu :routes=&quot;routes&quot; inverse&gt;</span></span>
<span class="line"><span>      &lt;/ds-menu&gt;</span></span>
<span class="line"><span>    &lt;/ds-flex-item&gt;</span></span>
<span class="line"><span>  &lt;/ds-flex&gt;</span></span>
<span class="line"><span>&lt;/template&gt;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>&lt;script&gt;</span></span>
<span class="line"><span>  export default {</span></span>
<span class="line"><span>    data() {</span></span>
<span class="line"><span>      return {</span></span>
<span class="line"><span>        routes: [</span></span>
<span class="line"><span>          {</span></span>
<span class="line"><span>            name: &#39;Introduction&#39;,</span></span>
<span class="line"><span>            path: &#39;/&#39;</span></span>
<span class="line"><span>          },</span></span>
<span class="line"><span>          {</span></span>
<span class="line"><span>            name: &#39;Navigation&#39;,</span></span>
<span class="line"><span>            path: &#39;/navigation&#39;,</span></span>
<span class="line"><span>            children: [</span></span>
<span class="line"><span>              {</span></span>
<span class="line"><span>                name: &#39;Menu&#39;,</span></span>
<span class="line"><span>                path: &#39;/navigation/dsmenu&#39;</span></span>
<span class="line"><span>              },</span></span>
<span class="line"><span>              {</span></span>
<span class="line"><span>                name: &#39;Breadcrumb&#39;,</span></span>
<span class="line"><span>                path: &#39;/navigation/dsbreadcrumb&#39;</span></span>
<span class="line"><span>              }</span></span>
<span class="line"><span>            ]</span></span>
<span class="line"><span>          },</span></span>
<span class="line"><span>          {</span></span>
<span class="line"><span>            name: &#39;Typography&#39;,</span></span>
<span class="line"><span>            path: &#39;/typography&#39;</span></span>
<span class="line"><span>          },</span></span>
<span class="line"><span>          {</span></span>
<span class="line"><span>            name: &#39;Layout&#39;,</span></span>
<span class="line"><span>            path: &#39;/layout&#39;</span></span>
<span class="line"><span>          }</span></span>
<span class="line"><span>        ]</span></span>
<span class="line"><span>      }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>  }</span></span>
<span class="line"><span>&lt;/script&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="navbar" tabindex="-1"><a class="header-anchor" href="#navbar"><span>Navbar</span></a></h2><p>Display the menu as a navbar. A navbar&#39;s height depends on it&#39;s nearest parent with a fixed height.</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>&lt;template&gt;</span></span>
<span class="line"><span>  &lt;div&gt;</span></span>
<span class="line"><span>    &lt;ds-space&gt;</span></span>
<span class="line"><span>      &lt;ds-menu :routes=&quot;routes&quot; navbar&gt;</span></span>
<span class="line"><span>      &lt;/ds-menu&gt;</span></span>
<span class="line"><span>    &lt;/ds-space&gt;</span></span>
<span class="line"><span>    &lt;ds-space margin-bottom=&quot;xxx-large&quot;&gt;</span></span>
<span class="line"><span>      &lt;ds-menu :routes=&quot;routes&quot; navbar inverse&gt;</span></span>
<span class="line"><span>      &lt;/ds-menu&gt;</span></span>
<span class="line"><span>    &lt;/ds-space&gt;</span></span>
<span class="line"><span>  &lt;/div&gt;</span></span>
<span class="line"><span>&lt;/template&gt;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>&lt;script&gt;</span></span>
<span class="line"><span>  export default {</span></span>
<span class="line"><span>    data() {</span></span>
<span class="line"><span>      return {</span></span>
<span class="line"><span>        routes: [</span></span>
<span class="line"><span>          {</span></span>
<span class="line"><span>            name: &#39;Introduction&#39;,</span></span>
<span class="line"><span>            path: &#39;/&#39;</span></span>
<span class="line"><span>          },</span></span>
<span class="line"><span>          {</span></span>
<span class="line"><span>            name: &#39;Navigation&#39;,</span></span>
<span class="line"><span>            path: &#39;/navigation&#39;,</span></span>
<span class="line"><span>            children: [</span></span>
<span class="line"><span>              {</span></span>
<span class="line"><span>                name: &#39;Menu&#39;,</span></span>
<span class="line"><span>                path: &#39;/navigation/dsmenu&#39;</span></span>
<span class="line"><span>              },</span></span>
<span class="line"><span>              {</span></span>
<span class="line"><span>                name: &#39;Breadcrumb&#39;,</span></span>
<span class="line"><span>                path: &#39;/navigation/dsbreadcrumb&#39;</span></span>
<span class="line"><span>              }</span></span>
<span class="line"><span>            ]</span></span>
<span class="line"><span>          },</span></span>
<span class="line"><span>          {</span></span>
<span class="line"><span>            name: &#39;Typography&#39;,</span></span>
<span class="line"><span>            path: &#39;/typography&#39;</span></span>
<span class="line"><span>          },</span></span>
<span class="line"><span>          {</span></span>
<span class="line"><span>            name: &#39;Layout&#39;,</span></span>
<span class="line"><span>            path: &#39;/layout&#39;</span></span>
<span class="line"><span>          }</span></span>
<span class="line"><span>        ]</span></span>
<span class="line"><span>      }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>  }</span></span>
<span class="line"><span>&lt;/script&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="custom-url-parser" tabindex="-1"><a class="header-anchor" href="#custom-url-parser"><span>Custom url parser</span></a></h2><p>By default the url is equal to a route&#39;s path. If no path is available the url is constructed from the route&#39;s parents names and the route&#39;s name.</p><p>You can provide a custom url parser function. It takes the route as the first argument, it&#39;s parents as the second and returns a string or anything that <a href="https://router.vuejs.org/api/#to" target="_blank" rel="noopener noreferrer">router-link&#39;s to prop</a> can handle.</p><p>When returning an object it might be necessary to also provide a custom is-exact function like in the example below.</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>&lt;template&gt;</span></span>
<span class="line"><span>  &lt;ds-menu</span></span>
<span class="line"><span>    :routes=&quot;routes&quot;</span></span>
<span class="line"><span>    :url-parser=&quot;urlParser&quot;</span></span>
<span class="line"><span>    :is-exact=&quot;isExact&quot;&gt;&lt;/ds-menu&gt;</span></span>
<span class="line"><span>&lt;/template&gt;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>&lt;script&gt;</span></span>
<span class="line"><span>  export default {</span></span>
<span class="line"><span>    data() {</span></span>
<span class="line"><span>      return {</span></span>
<span class="line"><span>        routes: [</span></span>
<span class="line"><span>          {</span></span>
<span class="line"><span>            name: &#39;Introduction&#39;</span></span>
<span class="line"><span>          },</span></span>
<span class="line"><span>          {</span></span>
<span class="line"><span>            name: &#39;Navigation&#39;,</span></span>
<span class="line"><span>            children: [</span></span>
<span class="line"><span>              {</span></span>
<span class="line"><span>                name: &#39;DsMenu&#39;</span></span>
<span class="line"><span>              },</span></span>
<span class="line"><span>              {</span></span>
<span class="line"><span>                name: &#39;DsBreadcrumb&#39;</span></span>
<span class="line"><span>              }</span></span>
<span class="line"><span>            ]</span></span>
<span class="line"><span>          },</span></span>
<span class="line"><span>          {</span></span>
<span class="line"><span>            name: &#39;Typography&#39;</span></span>
<span class="line"><span>          },</span></span>
<span class="line"><span>          {</span></span>
<span class="line"><span>            name: &#39;Layout&#39;</span></span>
<span class="line"><span>          }</span></span>
<span class="line"><span>        ]</span></span>
<span class="line"><span>      }</span></span>
<span class="line"><span>    },</span></span>
<span class="line"><span>    methods: {</span></span>
<span class="line"><span>      urlParser(route) {</span></span>
<span class="line"><span>        return {</span></span>
<span class="line"><span>          name: route.name</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>      },</span></span>
<span class="line"><span>      isExact(url) {</span></span>
<span class="line"><span>        return url.name === &#39;Introduction&#39;</span></span>
<span class="line"><span>      }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>  }</span></span>
<span class="line"><span>&lt;/script&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="custom-name-parser" tabindex="-1"><a class="header-anchor" href="#custom-name-parser"><span>Custom name parser</span></a></h2><p>You can customize the menu item&#39;s name by providing a name parser function.</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>&lt;template&gt;</span></span>
<span class="line"><span>  &lt;ds-menu</span></span>
<span class="line"><span>    :routes=&quot;routes&quot;</span></span>
<span class="line"><span>    :name-parser=&quot;nameParser&quot;&gt;&lt;/ds-menu&gt;</span></span>
<span class="line"><span>&lt;/template&gt;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>&lt;script&gt;</span></span>
<span class="line"><span>  export default {</span></span>
<span class="line"><span>    data() {</span></span>
<span class="line"><span>      return {</span></span>
<span class="line"><span>        routes: [</span></span>
<span class="line"><span>          {</span></span>
<span class="line"><span>            name: &#39;Introduction&#39;</span></span>
<span class="line"><span>          },</span></span>
<span class="line"><span>          {</span></span>
<span class="line"><span>            name: &#39;Typography&#39;</span></span>
<span class="line"><span>          },</span></span>
<span class="line"><span>          {</span></span>
<span class="line"><span>            name: &#39;Layout&#39;</span></span>
<span class="line"><span>          }</span></span>
<span class="line"><span>        ]</span></span>
<span class="line"><span>      }</span></span>
<span class="line"><span>    },</span></span>
<span class="line"><span>    methods: {</span></span>
<span class="line"><span>      nameParser(route) {</span></span>
<span class="line"><span>        return \`My \${route.name}\`</span></span>
<span class="line"><span>      }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>  }</span></span>
<span class="line"><span>&lt;/script&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="customize-menu-items" tabindex="-1"><a class="header-anchor" href="#customize-menu-items"><span>Customize menu items</span></a></h2><p>You can customize top level menu items using slots. The slot name is equal to the routes name.</p><p>If you want to keep the sub menu for this menu item, be sure to use the <code>ds-menu-item</code> component and pass down the <code>route</code> and <code>parents</code> prop.</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>&lt;template&gt;</span></span>
<span class="line"><span>  &lt;ds-menu :routes=&quot;routes&quot;&gt;</span></span>
<span class="line"><span>    &lt;ds-menu-item</span></span>
<span class="line"><span>      @click=&quot;handleClick&quot;</span></span>
<span class="line"><span>      slot=&quot;menuitem&quot;</span></span>
<span class="line"><span>      slot-scope=&quot;item&quot;</span></span>
<span class="line"><span>      :route=&quot;item.route&quot;</span></span>
<span class="line"><span>      :parents=&quot;item.parents&quot;&gt;</span></span>
<span class="line"><span>      Custom {{ item.route.name }}</span></span>
<span class="line"><span>    &lt;/ds-menu-item&gt;</span></span>
<span class="line"><span>  &lt;/ds-menu&gt;</span></span>
<span class="line"><span>&lt;/template&gt;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>&lt;script&gt;</span></span>
<span class="line"><span>  export default {</span></span>
<span class="line"><span>    data() {</span></span>
<span class="line"><span>      return {</span></span>
<span class="line"><span>        routes: [</span></span>
<span class="line"><span>          {</span></span>
<span class="line"><span>            name: &#39;Introduction&#39;,</span></span>
<span class="line"><span>            path: &#39;/&#39;</span></span>
<span class="line"><span>          },</span></span>
<span class="line"><span>          {</span></span>
<span class="line"><span>            name: &#39;Navigation&#39;,</span></span>
<span class="line"><span>            path: &#39;/navigation&#39;,</span></span>
<span class="line"><span>            children: [</span></span>
<span class="line"><span>              {</span></span>
<span class="line"><span>                name: &#39;Menu&#39;,</span></span>
<span class="line"><span>                path: &#39;/navigation/dsmenu&#39;</span></span>
<span class="line"><span>              },</span></span>
<span class="line"><span>              {</span></span>
<span class="line"><span>                name: &#39;Breadcrumb&#39;,</span></span>
<span class="line"><span>                path: &#39;/navigation/dsbreadcrumb&#39;</span></span>
<span class="line"><span>              }</span></span>
<span class="line"><span>            ]</span></span>
<span class="line"><span>          },</span></span>
<span class="line"><span>          {</span></span>
<span class="line"><span>            name: &#39;Typography&#39;,</span></span>
<span class="line"><span>            path: &#39;/typography&#39;</span></span>
<span class="line"><span>          },</span></span>
<span class="line"><span>          {</span></span>
<span class="line"><span>            name: &#39;Layout&#39;,</span></span>
<span class="line"><span>            path: &#39;/layout&#39;</span></span>
<span class="line"><span>          }</span></span>
<span class="line"><span>        ]</span></span>
<span class="line"><span>      }</span></span>
<span class="line"><span>    },</span></span>
<span class="line"><span>    methods: {</span></span>
<span class="line"><span>      handleClick(event, route) {</span></span>
<span class="line"><span>        event.preventDefault()</span></span>
<span class="line"><span>        alert(\`you clicked on \${route.name}\`)</span></span>
<span class="line"><span>      }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>  }</span></span>
<span class="line"><span>&lt;/script&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>`,18)]))}const v=n(l,[["render",p],["__file","demo.html.vue"]]),t=JSON.parse(`{"path":"/styleguide/src/system/components/navigation/Menu/demo.html","title":"","lang":"en-US","frontmatter":{},"headers":[{"level":2,"title":"Basic usage","slug":"basic-usage","link":"#basic-usage","children":[]},{"level":2,"title":"Navbar","slug":"navbar","link":"#navbar","children":[]},{"level":2,"title":"Custom url parser","slug":"custom-url-parser","link":"#custom-url-parser","children":[]},{"level":2,"title":"Custom name parser","slug":"custom-name-parser","link":"#custom-name-parser","children":[]},{"level":2,"title":"Customize menu items","slug":"customize-menu-items","link":"#customize-menu-items","children":[]}],"git":{"createdTime":1772453486000,"updatedTime":1772453486000,"contributors":[{"name":"Moriz Wahl","email":"moriz.wahl@gmx.de","commits":1}]},"readingTime":{"minutes":1.54,"words":462},"filePathRelative":"styleguide/src/system/components/navigation/Menu/demo.md","localizedDate":"March 2, 2026","excerpt":"<h2>Basic usage</h2>\\n<p>Display an array of route objects.</p>\\n<div class=\\"language- line-numbers-mode\\" data-highlighter=\\"shiki\\" data-ext=\\"\\" data-title=\\"\\" style=\\"--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34\\"><pre class=\\"shiki shiki-themes one-light one-dark-pro vp-code\\"><code><span class=\\"line\\"><span>&lt;template&gt;</span></span>\\n<span class=\\"line\\"><span>  &lt;ds-flex gutter=\\"base\\"&gt;</span></span>\\n<span class=\\"line\\"><span>    &lt;ds-flex-item&gt;</span></span>\\n<span class=\\"line\\"><span>      &lt;ds-menu :routes=\\"routes\\"&gt;</span></span>\\n<span class=\\"line\\"><span>      &lt;/ds-menu&gt;</span></span>\\n<span class=\\"line\\"><span>    &lt;/ds-flex-item&gt;</span></span>\\n<span class=\\"line\\"><span>    &lt;ds-flex-item&gt;</span></span>\\n<span class=\\"line\\"><span>      &lt;ds-menu :routes=\\"routes\\" inverse&gt;</span></span>\\n<span class=\\"line\\"><span>      &lt;/ds-menu&gt;</span></span>\\n<span class=\\"line\\"><span>    &lt;/ds-flex-item&gt;</span></span>\\n<span class=\\"line\\"><span>  &lt;/ds-flex&gt;</span></span>\\n<span class=\\"line\\"><span>&lt;/template&gt;</span></span>\\n<span class=\\"line\\"><span></span></span>\\n<span class=\\"line\\"><span>&lt;script&gt;</span></span>\\n<span class=\\"line\\"><span>  export default {</span></span>\\n<span class=\\"line\\"><span>    data() {</span></span>\\n<span class=\\"line\\"><span>      return {</span></span>\\n<span class=\\"line\\"><span>        routes: [</span></span>\\n<span class=\\"line\\"><span>          {</span></span>\\n<span class=\\"line\\"><span>            name: 'Introduction',</span></span>\\n<span class=\\"line\\"><span>            path: '/'</span></span>\\n<span class=\\"line\\"><span>          },</span></span>\\n<span class=\\"line\\"><span>          {</span></span>\\n<span class=\\"line\\"><span>            name: 'Navigation',</span></span>\\n<span class=\\"line\\"><span>            path: '/navigation',</span></span>\\n<span class=\\"line\\"><span>            children: [</span></span>\\n<span class=\\"line\\"><span>              {</span></span>\\n<span class=\\"line\\"><span>                name: 'Menu',</span></span>\\n<span class=\\"line\\"><span>                path: '/navigation/dsmenu'</span></span>\\n<span class=\\"line\\"><span>              },</span></span>\\n<span class=\\"line\\"><span>              {</span></span>\\n<span class=\\"line\\"><span>                name: 'Breadcrumb',</span></span>\\n<span class=\\"line\\"><span>                path: '/navigation/dsbreadcrumb'</span></span>\\n<span class=\\"line\\"><span>              }</span></span>\\n<span class=\\"line\\"><span>            ]</span></span>\\n<span class=\\"line\\"><span>          },</span></span>\\n<span class=\\"line\\"><span>          {</span></span>\\n<span class=\\"line\\"><span>            name: 'Typography',</span></span>\\n<span class=\\"line\\"><span>            path: '/typography'</span></span>\\n<span class=\\"line\\"><span>          },</span></span>\\n<span class=\\"line\\"><span>          {</span></span>\\n<span class=\\"line\\"><span>            name: 'Layout',</span></span>\\n<span class=\\"line\\"><span>            path: '/layout'</span></span>\\n<span class=\\"line\\"><span>          }</span></span>\\n<span class=\\"line\\"><span>        ]</span></span>\\n<span class=\\"line\\"><span>      }</span></span>\\n<span class=\\"line\\"><span>    }</span></span>\\n<span class=\\"line\\"><span>  }</span></span>\\n<span class=\\"line\\"><span>&lt;/script&gt;</span></span></code></pre>\\n<div class=\\"line-numbers\\" aria-hidden=\\"true\\" style=\\"counter-reset:line-number 0\\"><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div></div></div>"}`);export{v as comp,t as data};
