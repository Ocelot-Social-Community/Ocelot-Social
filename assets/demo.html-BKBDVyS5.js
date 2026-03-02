import{_ as n}from"./plugin-vue_export-helper-DlAUqK2U.js";import{c as a,a as e,o as l}from"./app-CuUP4fus.js";const i={};function p(d,s){return l(),a("div",null,s[0]||(s[0]=[e(`<h2 id="page-layouts" tabindex="-1"><a class="header-anchor" href="#page-layouts"><span>Page layouts</span></a></h2><p>You can layout a page in different ways. These are best described by example.</p><h3 id="sidebar-only" tabindex="-1"><a class="header-anchor" href="#sidebar-only"><span>Sidebar only</span></a></h3><div class="language-iframe line-numbers-mode" data-highlighter="shiki" data-ext="iframe" data-title="iframe" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>&lt;template&gt;</span></span>
<span class="line"><span>  &lt;ds-page ref=&quot;page&quot;&gt;</span></span>
<span class="line"><span>    &lt;template slot=&quot;brand&quot;&gt;</span></span>
<span class="line"><span>      &lt;ds-logo&gt;&lt;/ds-logo&gt;</span></span>
<span class="line"><span>    &lt;/template&gt;</span></span>
<span class="line"><span>    &lt;ds-menu</span></span>
<span class="line"><span>      @navigate=&quot;$refs.page.closeDrawer()&quot;</span></span>
<span class="line"><span>      slot=&quot;sidebar&quot;</span></span>
<span class="line"><span>      :routes=&quot;routes&quot;&gt;&lt;/ds-menu&gt;</span></span>
<span class="line"><span>    &lt;ds-menu</span></span>
<span class="line"><span>      @navigate=&quot;$refs.page.closeDrawer()&quot;</span></span>
<span class="line"><span>      slot=&quot;drawer&quot;</span></span>
<span class="line"><span>      :routes=&quot;routes&quot;&gt;&lt;/ds-menu&gt;</span></span>
<span class="line"><span>    &lt;ds-page-title heading=&quot;Sidebar only&quot;&gt;&lt;/ds-page-title&gt;</span></span>
<span class="line"><span>    &lt;ds-container&gt;</span></span>
<span class="line"><span>      &lt;ds-space margin-top=&quot;large&quot;&gt;</span></span>
<span class="line"><span>        &lt;ds-text&gt;</span></span>
<span class="line"><span>          This page uses only a sidebar.</span></span>
<span class="line"><span>        &lt;/ds-text&gt;</span></span>
<span class="line"><span>        &lt;ds-text&gt;</span></span>
<span class="line"><span>          On mobile devices it will hide the sidebar and show a header with a drawer toggle.</span></span>
<span class="line"><span>        &lt;/ds-text&gt;</span></span>
<span class="line"><span>      &lt;/ds-space&gt;</span></span>
<span class="line"><span>    &lt;/ds-container&gt;</span></span>
<span class="line"><span>  &lt;/ds-page&gt;</span></span>
<span class="line"><span>&lt;/template&gt;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>&lt;script&gt;</span></span>
<span class="line"><span>  export default {</span></span>
<span class="line"><span>    data() {</span></span>
<span class="line"><span>      return {</span></span>
<span class="line"><span>        routes: [</span></span>
<span class="line"><span>          { name: &#39;Introduction&#39; },</span></span>
<span class="line"><span>          {</span></span>
<span class="line"><span>            name: &#39;Layout&#39;,</span></span>
<span class="line"><span>            children: [</span></span>
<span class="line"><span>              { name: &#39;Container&#39; },</span></span>
<span class="line"><span>              { name: &#39;Page&#39; },</span></span>
<span class="line"><span>              { name: &#39;Page Title&#39; }</span></span>
<span class="line"><span>            ]</span></span>
<span class="line"><span>          },</span></span>
<span class="line"><span>          { name: &#39;Typography&#39; },</span></span>
<span class="line"><span>          { name: &#39;Navigation&#39; }</span></span>
<span class="line"><span>        ]</span></span>
<span class="line"><span>      }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>  }</span></span>
<span class="line"><span>&lt;/script&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="navbar-only" tabindex="-1"><a class="header-anchor" href="#navbar-only"><span>Navbar only</span></a></h3><div class="language-iframe line-numbers-mode" data-highlighter="shiki" data-ext="iframe" data-title="iframe" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>&lt;template&gt;</span></span>
<span class="line"><span>  &lt;ds-page ref=&quot;page&quot;&gt;</span></span>
<span class="line"><span>    &lt;template slot=&quot;brand&quot;&gt;</span></span>
<span class="line"><span>      &lt;ds-logo&gt;&lt;/ds-logo&gt;</span></span>
<span class="line"><span>    &lt;/template&gt;</span></span>
<span class="line"><span>    &lt;ds-menu</span></span>
<span class="line"><span>      @navigate=&quot;$refs.page.closeDrawer()&quot;</span></span>
<span class="line"><span>      slot=&quot;navbar&quot;</span></span>
<span class="line"><span>      :routes=&quot;routes&quot;</span></span>
<span class="line"><span>      navbar&gt;&lt;/ds-menu&gt;</span></span>
<span class="line"><span>    &lt;ds-menu</span></span>
<span class="line"><span>      @navigate=&quot;$refs.page.closeDrawer()&quot;</span></span>
<span class="line"><span>      slot=&quot;drawer&quot;</span></span>
<span class="line"><span>      :routes=&quot;routes&quot;&gt;&lt;/ds-menu&gt;</span></span>
<span class="line"><span>    &lt;ds-page-title heading=&quot;Navbar only&quot;&gt;&lt;/ds-page-title&gt;</span></span>
<span class="line"><span>    &lt;ds-container&gt;</span></span>
<span class="line"><span>      &lt;ds-space margin-top=&quot;large&quot;&gt;</span></span>
<span class="line"><span>        &lt;ds-text&gt;</span></span>
<span class="line"><span>          This page uses only a navbar.</span></span>
<span class="line"><span>        &lt;/ds-text&gt;</span></span>
<span class="line"><span>        &lt;ds-text&gt;</span></span>
<span class="line"><span>          On mobile devices it will hide the navbar and show a drawer toggle.</span></span>
<span class="line"><span>        &lt;/ds-text&gt;</span></span>
<span class="line"><span>      &lt;/ds-space&gt;</span></span>
<span class="line"><span>    &lt;/ds-container&gt;</span></span>
<span class="line"><span>  &lt;/ds-page&gt;</span></span>
<span class="line"><span>&lt;/template&gt;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>&lt;script&gt;</span></span>
<span class="line"><span>  export default {</span></span>
<span class="line"><span>    data() {</span></span>
<span class="line"><span>      return {</span></span>
<span class="line"><span>        routes: [</span></span>
<span class="line"><span>          { name: &#39;Introduction&#39; },</span></span>
<span class="line"><span>          {</span></span>
<span class="line"><span>            name: &#39;Layout&#39;,</span></span>
<span class="line"><span>            children: [</span></span>
<span class="line"><span>              { name: &#39;Container&#39; },</span></span>
<span class="line"><span>              { name: &#39;Page&#39; },</span></span>
<span class="line"><span>              { name: &#39;Page Title&#39; }</span></span>
<span class="line"><span>            ]</span></span>
<span class="line"><span>          },</span></span>
<span class="line"><span>          { name: &#39;Typography&#39; },</span></span>
<span class="line"><span>          { name: &#39;Navigation&#39; }</span></span>
<span class="line"><span>        ]</span></span>
<span class="line"><span>      }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>  }</span></span>
<span class="line"><span>&lt;/script&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="sidebar-and-navbar" tabindex="-1"><a class="header-anchor" href="#sidebar-and-navbar"><span>Sidebar and Navbar</span></a></h3><div class="language-iframe line-numbers-mode" data-highlighter="shiki" data-ext="iframe" data-title="iframe" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>&lt;template&gt;</span></span>
<span class="line"><span>  &lt;ds-page ref=&quot;page&quot;&gt;</span></span>
<span class="line"><span>    &lt;template slot=&quot;brand&quot;&gt;</span></span>
<span class="line"><span>      &lt;ds-logo&gt;&lt;/ds-logo&gt;</span></span>
<span class="line"><span>    &lt;/template&gt;</span></span>
<span class="line"><span>    &lt;ds-menu</span></span>
<span class="line"><span>      @navigate=&quot;$refs.page.closeDrawer()&quot;</span></span>
<span class="line"><span>      slot=&quot;navbar&quot;</span></span>
<span class="line"><span>      :routes=&quot;routes&quot;</span></span>
<span class="line"><span>      navbar&gt;&lt;/ds-menu&gt;</span></span>
<span class="line"><span>    &lt;ds-menu</span></span>
<span class="line"><span>      @navigate=&quot;$refs.page.closeDrawer()&quot;</span></span>
<span class="line"><span>      slot=&quot;sidebar&quot;</span></span>
<span class="line"><span>      :routes=&quot;routes&quot;&gt;&lt;/ds-menu&gt;</span></span>
<span class="line"><span>    &lt;ds-menu</span></span>
<span class="line"><span>      @navigate=&quot;$refs.page.closeDrawer()&quot;</span></span>
<span class="line"><span>      slot=&quot;drawer&quot;</span></span>
<span class="line"><span>      :routes=&quot;routes&quot;&gt;&lt;/ds-menu&gt;</span></span>
<span class="line"><span>    &lt;ds-page-title heading=&quot;Sidebar and Navbar&quot;&gt;&lt;/ds-page-title&gt;</span></span>
<span class="line"><span>    &lt;ds-container&gt;</span></span>
<span class="line"><span>      &lt;ds-space margin-top=&quot;large&quot;&gt;</span></span>
<span class="line"><span>        &lt;ds-text&gt;</span></span>
<span class="line"><span>          This page uses the best of both worlds.</span></span>
<span class="line"><span>        &lt;/ds-text&gt;</span></span>
<span class="line"><span>        &lt;ds-text&gt;</span></span>
<span class="line"><span>          On mobile devices it will hide the navbar as well as the sidebar and show a drawer toggle.</span></span>
<span class="line"><span>        &lt;/ds-text&gt;</span></span>
<span class="line"><span>      &lt;/ds-space&gt;</span></span>
<span class="line"><span>    &lt;/ds-container&gt;</span></span>
<span class="line"><span>  &lt;/ds-page&gt;</span></span>
<span class="line"><span>&lt;/template&gt;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>&lt;script&gt;</span></span>
<span class="line"><span>  export default {</span></span>
<span class="line"><span>    data() {</span></span>
<span class="line"><span>      return {</span></span>
<span class="line"><span>        routes: [</span></span>
<span class="line"><span>          { name: &#39;Introduction&#39; },</span></span>
<span class="line"><span>          {</span></span>
<span class="line"><span>            name: &#39;Layout&#39;,</span></span>
<span class="line"><span>            children: [</span></span>
<span class="line"><span>              { name: &#39;Container&#39; },</span></span>
<span class="line"><span>              { name: &#39;Page&#39; },</span></span>
<span class="line"><span>              { name: &#39;Page Title&#39; }</span></span>
<span class="line"><span>            ]</span></span>
<span class="line"><span>          },</span></span>
<span class="line"><span>          { name: &#39;Typography&#39; },</span></span>
<span class="line"><span>          { name: &#39;Navigation&#39; }</span></span>
<span class="line"><span>        ]</span></span>
<span class="line"><span>      }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>  }</span></span>
<span class="line"><span>&lt;/script&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>`,8)]))}const r=n(i,[["render",p],["__file","demo.html.vue"]]),v=JSON.parse(`{"path":"/styleguide/src/system/components/layout/Page/demo.html","title":"","lang":"en-US","frontmatter":{},"headers":[{"level":2,"title":"Page layouts","slug":"page-layouts","link":"#page-layouts","children":[{"level":3,"title":"Sidebar only","slug":"sidebar-only","link":"#sidebar-only","children":[]},{"level":3,"title":"Navbar only","slug":"navbar-only","link":"#navbar-only","children":[]},{"level":3,"title":"Sidebar and Navbar","slug":"sidebar-and-navbar","link":"#sidebar-and-navbar","children":[]}]}],"git":{"createdTime":1772453486000,"updatedTime":1772453486000,"contributors":[{"name":"Moriz Wahl","email":"moriz.wahl@gmx.de","commits":1}]},"readingTime":{"minutes":1.22,"words":367},"filePathRelative":"styleguide/src/system/components/layout/Page/demo.md","localizedDate":"March 2, 2026","excerpt":"<h2>Page layouts</h2>\\n<p>You can layout a page in different ways. These are best described by example.</p>\\n<h3>Sidebar only</h3>\\n<div class=\\"language-iframe line-numbers-mode\\" data-highlighter=\\"shiki\\" data-ext=\\"iframe\\" data-title=\\"iframe\\" style=\\"--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34\\"><pre class=\\"shiki shiki-themes one-light one-dark-pro vp-code\\"><code><span class=\\"line\\"><span>&lt;template&gt;</span></span>\\n<span class=\\"line\\"><span>  &lt;ds-page ref=\\"page\\"&gt;</span></span>\\n<span class=\\"line\\"><span>    &lt;template slot=\\"brand\\"&gt;</span></span>\\n<span class=\\"line\\"><span>      &lt;ds-logo&gt;&lt;/ds-logo&gt;</span></span>\\n<span class=\\"line\\"><span>    &lt;/template&gt;</span></span>\\n<span class=\\"line\\"><span>    &lt;ds-menu</span></span>\\n<span class=\\"line\\"><span>      @navigate=\\"$refs.page.closeDrawer()\\"</span></span>\\n<span class=\\"line\\"><span>      slot=\\"sidebar\\"</span></span>\\n<span class=\\"line\\"><span>      :routes=\\"routes\\"&gt;&lt;/ds-menu&gt;</span></span>\\n<span class=\\"line\\"><span>    &lt;ds-menu</span></span>\\n<span class=\\"line\\"><span>      @navigate=\\"$refs.page.closeDrawer()\\"</span></span>\\n<span class=\\"line\\"><span>      slot=\\"drawer\\"</span></span>\\n<span class=\\"line\\"><span>      :routes=\\"routes\\"&gt;&lt;/ds-menu&gt;</span></span>\\n<span class=\\"line\\"><span>    &lt;ds-page-title heading=\\"Sidebar only\\"&gt;&lt;/ds-page-title&gt;</span></span>\\n<span class=\\"line\\"><span>    &lt;ds-container&gt;</span></span>\\n<span class=\\"line\\"><span>      &lt;ds-space margin-top=\\"large\\"&gt;</span></span>\\n<span class=\\"line\\"><span>        &lt;ds-text&gt;</span></span>\\n<span class=\\"line\\"><span>          This page uses only a sidebar.</span></span>\\n<span class=\\"line\\"><span>        &lt;/ds-text&gt;</span></span>\\n<span class=\\"line\\"><span>        &lt;ds-text&gt;</span></span>\\n<span class=\\"line\\"><span>          On mobile devices it will hide the sidebar and show a header with a drawer toggle.</span></span>\\n<span class=\\"line\\"><span>        &lt;/ds-text&gt;</span></span>\\n<span class=\\"line\\"><span>      &lt;/ds-space&gt;</span></span>\\n<span class=\\"line\\"><span>    &lt;/ds-container&gt;</span></span>\\n<span class=\\"line\\"><span>  &lt;/ds-page&gt;</span></span>\\n<span class=\\"line\\"><span>&lt;/template&gt;</span></span>\\n<span class=\\"line\\"><span></span></span>\\n<span class=\\"line\\"><span>&lt;script&gt;</span></span>\\n<span class=\\"line\\"><span>  export default {</span></span>\\n<span class=\\"line\\"><span>    data() {</span></span>\\n<span class=\\"line\\"><span>      return {</span></span>\\n<span class=\\"line\\"><span>        routes: [</span></span>\\n<span class=\\"line\\"><span>          { name: 'Introduction' },</span></span>\\n<span class=\\"line\\"><span>          {</span></span>\\n<span class=\\"line\\"><span>            name: 'Layout',</span></span>\\n<span class=\\"line\\"><span>            children: [</span></span>\\n<span class=\\"line\\"><span>              { name: 'Container' },</span></span>\\n<span class=\\"line\\"><span>              { name: 'Page' },</span></span>\\n<span class=\\"line\\"><span>              { name: 'Page Title' }</span></span>\\n<span class=\\"line\\"><span>            ]</span></span>\\n<span class=\\"line\\"><span>          },</span></span>\\n<span class=\\"line\\"><span>          { name: 'Typography' },</span></span>\\n<span class=\\"line\\"><span>          { name: 'Navigation' }</span></span>\\n<span class=\\"line\\"><span>        ]</span></span>\\n<span class=\\"line\\"><span>      }</span></span>\\n<span class=\\"line\\"><span>    }</span></span>\\n<span class=\\"line\\"><span>  }</span></span>\\n<span class=\\"line\\"><span>&lt;/script&gt;</span></span></code></pre>\\n<div class=\\"line-numbers\\" aria-hidden=\\"true\\" style=\\"counter-reset:line-number 0\\"><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div></div></div>"}`);export{r as comp,v as data};
