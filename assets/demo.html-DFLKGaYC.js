import{_ as l}from"./plugin-vue_export-helper-DlAUqK2U.js";import{c as i,a as n,b as a,d as e,o as p}from"./app-CuUP4fus.js";const t={};function d(c,s){return p(),i("div",null,s[0]||(s[0]=[n(`<h2 id="basic-usage" tabindex="-1"><a class="header-anchor" href="#basic-usage"><span>Basic usage</span></a></h2><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>&lt;ds-select :options=&quot;[&#39;blue&#39;, &#39;red&#39;, &#39;green&#39;]&quot; /&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><h2 id="usage-with-label" tabindex="-1"><a class="header-anchor" href="#usage-with-label"><span>Usage with label</span></a></h2><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>&lt;ds-select</span></span>
<span class="line"><span>  label=&quot;Color&quot;</span></span>
<span class="line"><span>  :options=&quot;[&#39;blue&#39;, &#39;red&#39;, &#39;green&#39;]&quot; /&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="bind-to-a-value" tabindex="-1"><a class="header-anchor" href="#bind-to-a-value"><span>Bind to a value</span></a></h2><p>Use v-model to bind a value to the select input.</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>&lt;template&gt;</span></span>
<span class="line"><span>  &lt;div&gt;</span></span>
<span class="line"><span>    &lt;ds-select</span></span>
<span class="line"><span>      v-model=&quot;color&quot;</span></span>
<span class="line"><span>      :options=&quot;[&#39;blue&#39;, &#39;red&#39;, &#39;green&#39;]&quot;</span></span>
<span class="line"><span>      placeholder=&quot;Color ...&quot;&gt;&lt;/ds-select&gt;</span></span>
<span class="line"><span>    &lt;ds-text&gt;Your color: {{ color }}&lt;/ds-text&gt;</span></span>
<span class="line"><span>  &lt;/div&gt;</span></span>
<span class="line"><span>&lt;/template&gt;</span></span>
<span class="line"><span>&lt;script&gt;</span></span>
<span class="line"><span>  export default {</span></span>
<span class="line"><span>    data() {</span></span>
<span class="line"><span>      return {</span></span>
<span class="line"><span>        color: &#39;blue&#39;</span></span>
<span class="line"><span>      }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>  }</span></span>
<span class="line"><span>&lt;/script&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="multiselect" tabindex="-1"><a class="header-anchor" href="#multiselect"><span>Multiselect</span></a></h2><p>Use the multiple prop to allow the user selecting multiple values.</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>&lt;template&gt;</span></span>
<span class="line"><span>  &lt;div&gt;</span></span>
<span class="line"><span>    &lt;ds-select</span></span>
<span class="line"><span>      v-model=&quot;color&quot;</span></span>
<span class="line"><span>      :options=&quot;[&#39;blue&#39;, &#39;red&#39;, &#39;green&#39;]&quot;</span></span>
<span class="line"><span>      placeholder=&quot;Color ...&quot;</span></span>
<span class="line"><span>      multiple&gt;&lt;/ds-select&gt;</span></span>
<span class="line"><span>    &lt;ds-text&gt;Your colors: {{ color }}&lt;/ds-text&gt;</span></span>
<span class="line"><span>  &lt;/div&gt;</span></span>
<span class="line"><span>&lt;/template&gt;</span></span>
<span class="line"><span>&lt;script&gt;</span></span>
<span class="line"><span>  export default {</span></span>
<span class="line"><span>    data() {</span></span>
<span class="line"><span>      return {</span></span>
<span class="line"><span>        color: [&#39;blue&#39;, &#39;red&#39;]</span></span>
<span class="line"><span>      }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>  }</span></span>
<span class="line"><span>&lt;/script&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="options-as-objects" tabindex="-1"><a class="header-anchor" href="#options-as-objects"><span>Options as objects</span></a></h2><p>Options can be objects. You can define which property to show as the label by defining label-prop. Defaults to &quot;label&quot;.</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>&lt;template&gt;</span></span>
<span class="line"><span>  &lt;div&gt;</span></span>
<span class="line"><span>    &lt;ds-select</span></span>
<span class="line"><span>      v-model=&quot;color&quot;</span></span>
<span class="line"><span>      :options=&quot;colorOptions&quot;</span></span>
<span class="line"><span>      placeholder=&quot;Color ...&quot;&gt;&lt;/ds-select&gt;</span></span>
<span class="line"><span>    &lt;ds-text&gt;Selected color: {{ color }}&lt;/ds-text&gt;</span></span>
<span class="line"><span>    &lt;ds-select</span></span>
<span class="line"><span>      v-model=&quot;colors&quot;</span></span>
<span class="line"><span>      :options=&quot;colorOptions&quot;</span></span>
<span class="line"><span>      placeholder=&quot;Colors ...&quot;</span></span>
<span class="line"><span>      multiple&gt;&lt;/ds-select&gt;</span></span>
<span class="line"><span>    &lt;ds-text&gt;Selected colors: {{ colors }}&lt;/ds-text&gt;</span></span>
<span class="line"><span>  &lt;/div&gt;</span></span>
<span class="line"><span>&lt;/template&gt;</span></span>
<span class="line"><span>&lt;script&gt;</span></span>
<span class="line"><span>  export default {</span></span>
<span class="line"><span>    data() {</span></span>
<span class="line"><span>      return {</span></span>
<span class="line"><span>        color: null,</span></span>
<span class="line"><span>        colors: [],</span></span>
<span class="line"><span>        colorOptions: [</span></span>
<span class="line"><span>          {</span></span>
<span class="line"><span>            label: &#39;blue&#39;,</span></span>
<span class="line"><span>            value: &#39;#0e17d8&#39;</span></span>
<span class="line"><span>          },</span></span>
<span class="line"><span>          {</span></span>
<span class="line"><span>            label: &#39;red&#39;,</span></span>
<span class="line"><span>            value: &#39;#d80e3f&#39;</span></span>
<span class="line"><span>          },</span></span>
<span class="line"><span>          {</span></span>
<span class="line"><span>            label: &#39;green&#39;,</span></span>
<span class="line"><span>            value: &#39;#0ed853&#39;</span></span>
<span class="line"><span>          }</span></span>
<span class="line"><span>        ]</span></span>
<span class="line"><span>      }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>  }</span></span>
<span class="line"><span>&lt;/script&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="validation" tabindex="-1"><a class="header-anchor" href="#validation"><span>Validation</span></a></h2>`,14),a("p",null,[e("We use "),a("a",{href:"https://github.com/yiminghe/async-validator",targe:"_blank"},"async-validator schemas"),e(" for validation.")],-1),n(`<p>If you need to validate more than one field it is better to use the form component.</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>&lt;template&gt;</span></span>
<span class="line"><span>  &lt;div&gt;</span></span>
<span class="line"><span>    &lt;ds-select</span></span>
<span class="line"><span>      v-model=&quot;color&quot;</span></span>
<span class="line"><span>      :options=&quot;[&#39;blue&#39;, &#39;red&#39;, &#39;green&#39;]&quot;</span></span>
<span class="line"><span>      :schema=&quot;{type: &#39;enum&#39;, enum: [&#39;green&#39;], message: &#39;Please choose green :)&#39; }&quot;</span></span>
<span class="line"><span>      placeholder=&quot;Color ...&quot; /&gt;</span></span>
<span class="line"><span>  &lt;/div&gt;</span></span>
<span class="line"><span>&lt;/template&gt;</span></span>
<span class="line"><span>&lt;script&gt;</span></span>
<span class="line"><span>  export default {</span></span>
<span class="line"><span>    data() {</span></span>
<span class="line"><span>      return {</span></span>
<span class="line"><span>        color: &#39;&#39;</span></span>
<span class="line"><span>      }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>  }</span></span>
<span class="line"><span>&lt;/script&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="select-sizes" tabindex="-1"><a class="header-anchor" href="#select-sizes"><span>Select sizes</span></a></h2><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>&lt;ds-select placeholder=&quot;Small ...&quot; size=&quot;small&quot;&gt;&lt;/ds-select&gt;</span></span>
<span class="line"><span>&lt;ds-select placeholder=&quot;Base ...&quot;&gt;&lt;/ds-select&gt;</span></span>
<span class="line"><span>&lt;ds-select placeholder=&quot;Large ...&quot; size=&quot;large&quot;&gt;&lt;/ds-select&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="select-icons" tabindex="-1"><a class="header-anchor" href="#select-icons"><span>Select icons</span></a></h2><p>Add an icon to help the user identify the select fields usage.</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>&lt;ds-select</span></span>
<span class="line"><span>  placeholder=&quot;User ...&quot;</span></span>
<span class="line"><span>  icon=&quot;user&quot;&gt;&lt;/ds-select&gt;</span></span>
<span class="line"><span>&lt;ds-select</span></span>
<span class="line"><span>  placeholder=&quot;Day ...&quot;</span></span>
<span class="line"><span>  icon=&quot;clock&quot;&gt;&lt;/ds-select&gt;</span></span>
<span class="line"><span>&lt;ds-select</span></span>
<span class="line"><span>  placeholder=&quot;User ...&quot;</span></span>
<span class="line"><span>  size=&quot;small&quot;</span></span>
<span class="line"><span>  icon=&quot;user&quot;&gt;&lt;/ds-select&gt;</span></span>
<span class="line"><span>&lt;ds-select</span></span>
<span class="line"><span>  placeholder=&quot;User ...&quot;</span></span>
<span class="line"><span>  size=&quot;large&quot;</span></span>
<span class="line"><span>  icon=&quot;user&quot;&gt;&lt;/ds-select&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>`,7)]))}const u=l(t,[["render",d],["__file","demo.html.vue"]]),v=JSON.parse(`{"path":"/styleguide/src/system/components/data-input/Select/demo.html","title":"","lang":"en-US","frontmatter":{},"headers":[{"level":2,"title":"Basic usage","slug":"basic-usage","link":"#basic-usage","children":[]},{"level":2,"title":"Usage with label","slug":"usage-with-label","link":"#usage-with-label","children":[]},{"level":2,"title":"Bind to a value","slug":"bind-to-a-value","link":"#bind-to-a-value","children":[]},{"level":2,"title":"Multiselect","slug":"multiselect","link":"#multiselect","children":[]},{"level":2,"title":"Options as objects","slug":"options-as-objects","link":"#options-as-objects","children":[]},{"level":2,"title":"Validation","slug":"validation","link":"#validation","children":[]},{"level":2,"title":"Select sizes","slug":"select-sizes","link":"#select-sizes","children":[]},{"level":2,"title":"Select icons","slug":"select-icons","link":"#select-icons","children":[]}],"git":{"createdTime":1772453486000,"updatedTime":1772453486000,"contributors":[{"name":"Moriz Wahl","email":"moriz.wahl@gmx.de","commits":1}]},"readingTime":{"minutes":1.18,"words":353},"filePathRelative":"styleguide/src/system/components/data-input/Select/demo.md","localizedDate":"March 2, 2026","excerpt":"<h2>Basic usage</h2>\\n<div class=\\"language- line-numbers-mode\\" data-highlighter=\\"shiki\\" data-ext=\\"\\" data-title=\\"\\" style=\\"--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34\\"><pre class=\\"shiki shiki-themes one-light one-dark-pro vp-code\\"><code><span class=\\"line\\"><span>&lt;ds-select :options=\\"['blue', 'red', 'green']\\" /&gt;</span></span></code></pre>\\n<div class=\\"line-numbers\\" aria-hidden=\\"true\\" style=\\"counter-reset:line-number 0\\"><div class=\\"line-number\\"></div></div></div>"}`);export{u as comp,v as data};
