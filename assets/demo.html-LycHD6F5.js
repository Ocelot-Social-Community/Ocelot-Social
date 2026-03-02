import{_ as a}from"./plugin-vue_export-helper-DlAUqK2U.js";import{c as n,a as i,o as e}from"./app-CuUP4fus.js";const l={};function t(p,s){return e(),n("div",null,s[0]||(s[0]=[i(`<h2 id="basic-modal" tabindex="-1"><a class="header-anchor" href="#basic-modal"><span>Basic Modal</span></a></h2><p>Basic modal usage</p><div class="language-html line-numbers-mode" data-highlighter="shiki" data-ext="html" data-title="html" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">&lt;</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75;">ds-modal</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66;"> style</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">=</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379;">&quot;</span><span style="--shiki-light:#383A42;--shiki-dark:#98C379;">position: absolute</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379;">&quot;</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;"> /&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>&lt;template&gt;</span></span>
<span class="line"><span>  &lt;div&gt;</span></span>
<span class="line"><span>    &lt;ds-modal </span></span>
<span class="line"><span>      v-model=&quot;isOpen&quot;</span></span>
<span class="line"><span>      title=&quot;Modal Title&quot; </span></span>
<span class="line"><span>    &gt;</span></span>
<span class="line"><span>      &lt;p&gt;Hello World&lt;/p&gt;</span></span>
<span class="line"><span>    &lt;/ds-modal&gt;</span></span>
<span class="line"><span>    &lt;ds-button primary icon=&quot;rocket&quot; @click=&quot;isOpen = true&quot;&gt;Open Modal&lt;/ds-button&gt;</span></span>
<span class="line"><span>  &lt;/div&gt;</span></span>
<span class="line"><span>&lt;/template&gt;</span></span>
<span class="line"><span>&lt;script&gt;</span></span>
<span class="line"><span>  export default {</span></span>
<span class="line"><span>    data() {</span></span>
<span class="line"><span>      return {</span></span>
<span class="line"><span>        isOpen: false</span></span>
<span class="line"><span>      }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>  }</span></span>
<span class="line"><span>&lt;/script&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>Customize button labels</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>&lt;template&gt;</span></span>
<span class="line"><span>  &lt;div&gt;</span></span>
<span class="line"><span>    &lt;ds-modal </span></span>
<span class="line"><span>      v-if=&quot;isOpen&quot;</span></span>
<span class="line"><span>      v-model=&quot;isOpen&quot;</span></span>
<span class="line"><span>      title=&quot;Custom Button Labels&quot; </span></span>
<span class="line"><span>      force</span></span>
<span class="line"><span>      extended</span></span>
<span class="line"><span>      confirm-label=&quot;All right&quot;</span></span>
<span class="line"><span>      cancel-label=&quot;Please not&quot;</span></span>
<span class="line"><span>    &gt;</span></span>
<span class="line"><span>      &lt;p&gt;Culpa amet sunt aperiam ratione est sed. Molestiae minus doloremque libero. Beatae nam repellendus aliquid maxime.&lt;/p&gt;</span></span>
<span class="line"><span>      &lt;p&gt;Sint quasi provident natus id earum debitis. Et facilis a iure ullam. Velit autem eveniet ea reprehenderit ducimus doloribus earum quo.&lt;/p&gt;</span></span>
<span class="line"><span>      &lt;p&gt;Consequatur ratione repudiandae aliquid ea. Ut eum architecto assumenda. Autem eaque provident quia et.&lt;/p&gt;</span></span>
<span class="line"><span>      &lt;p&gt;Eaque quia aut dolorum sunt ea consequuntur. Labore reprehenderit placeat pariatur molestiae sit laborum nostrum. Deserunt est commodi et suscipit tenetur ipsa voluptas cupiditate. Porro laborum quidem ut corrupti. Dolorum et est placeat qui.&lt;/p&gt;</span></span>
<span class="line"><span>      &lt;p&gt;Adipisci beatae cumque esse harum. Error quis nulla illo nemo est. Enim est quis explicabo voluptatem. Omnis maxime qui similique consequatur voluptatibus. Est necessitatibus iure aliquid omnis eum. Ut voluptatibus vel error exercitationem temporibus qui expedita.&lt;/p&gt;</span></span>
<span class="line"><span>    &lt;/ds-modal&gt;</span></span>
<span class="line"><span>    &lt;ds-button primary icon=&quot;rocket&quot; @click=&quot;isOpen = true&quot;&gt;Open Modal&lt;/ds-button&gt;</span></span>
<span class="line"><span>  &lt;/div&gt;</span></span>
<span class="line"><span>&lt;/template&gt;</span></span>
<span class="line"><span>&lt;script&gt;</span></span>
<span class="line"><span>  export default {</span></span>
<span class="line"><span>    data() {</span></span>
<span class="line"><span>      return {</span></span>
<span class="line"><span>        isOpen: false</span></span>
<span class="line"><span>      }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>  }</span></span>
<span class="line"><span>&lt;/script&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>`,6)]))}const c=a(l,[["render",t],["__file","demo.html.vue"]]),u=JSON.parse('{"path":"/styleguide/src/system/components/layout/Modal/demo.html","title":"","lang":"en-US","frontmatter":{},"headers":[{"level":2,"title":"Basic Modal","slug":"basic-modal","link":"#basic-modal","children":[]}],"git":{"createdTime":1772453486000,"updatedTime":1772453486000,"contributors":[{"name":"Moriz Wahl","email":"moriz.wahl@gmx.de","commits":1}]},"readingTime":{"minutes":0.77,"words":232},"filePathRelative":"styleguide/src/system/components/layout/Modal/demo.md","localizedDate":"March 2, 2026","excerpt":"<h2>Basic Modal</h2>\\n<p>Basic modal usage</p>\\n<div class=\\"language-html line-numbers-mode\\" data-highlighter=\\"shiki\\" data-ext=\\"html\\" data-title=\\"html\\" style=\\"--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34\\"><pre class=\\"shiki shiki-themes one-light one-dark-pro vp-code\\"><code><span class=\\"line\\"><span style=\\"--shiki-light:#383A42;--shiki-dark:#ABB2BF\\">&lt;</span><span style=\\"--shiki-light:#E45649;--shiki-dark:#E06C75\\">ds-modal</span><span style=\\"--shiki-light:#986801;--shiki-dark:#D19A66\\"> style</span><span style=\\"--shiki-light:#383A42;--shiki-dark:#ABB2BF\\">=</span><span style=\\"--shiki-light:#50A14F;--shiki-dark:#98C379\\">\\"</span><span style=\\"--shiki-light:#383A42;--shiki-dark:#98C379\\">position: absolute</span><span style=\\"--shiki-light:#50A14F;--shiki-dark:#98C379\\">\\"</span><span style=\\"--shiki-light:#383A42;--shiki-dark:#ABB2BF\\"> /&gt;</span></span></code></pre>\\n<div class=\\"line-numbers\\" aria-hidden=\\"true\\" style=\\"counter-reset:line-number 0\\"><div class=\\"line-number\\"></div></div></div>"}');export{c as comp,u as data};
