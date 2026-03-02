import{_ as n}from"./plugin-vue_export-helper-DlAUqK2U.js";import{c as a,a as e,o as i}from"./app-CuUP4fus.js";const l={};function p(t,s){return i(),a("div",null,s[0]||(s[0]=[e(`<h2 id="common-usage" tabindex="-1"><a class="header-anchor" href="#common-usage"><span>Common usage</span></a></h2><p>Set a header and image for the card and provide some content.</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>&lt;ds-flex gutter=&quot;base&quot; :width=&quot;{ base: &#39;100%&#39;, sm: 1 }&quot;&gt;</span></span>
<span class="line"><span>  &lt;ds-flex-item&gt;</span></span>
<span class="line"><span>    &lt;ds-card</span></span>
<span class="line"><span>      header=&quot;The header&quot;</span></span>
<span class="line"><span>      image=&quot;https://picsum.photos/400/300?image=1063&quot;&gt;</span></span>
<span class="line"><span>      Look ma! I&#39;m in a card.</span></span>
<span class="line"><span>    &lt;/ds-card&gt;</span></span>
<span class="line"><span>  &lt;/ds-flex-item&gt;</span></span>
<span class="line"><span>  &lt;ds-flex-item&gt;</span></span>
<span class="line"><span>    &lt;ds-card</span></span>
<span class="line"><span>      header=&quot;The header&quot;</span></span>
<span class="line"><span>      image=&quot;https://picsum.photos/400/300?image=260&quot;&gt;</span></span>
<span class="line"><span>      Look ma! I&#39;m in a card.</span></span>
<span class="line"><span>    &lt;/ds-card&gt;</span></span>
<span class="line"><span>  &lt;/ds-flex-item&gt;</span></span>
<span class="line"><span>&lt;/ds-flex&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="space" tabindex="-1"><a class="header-anchor" href="#space"><span>Space</span></a></h2><p>Need more or less space top and bottom of the card? Specify with with the <code>space</code> prop</p><div class="language-html line-numbers-mode" data-highlighter="shiki" data-ext="html" data-title="html" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">&lt;</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75;">ds-card</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66;"> space</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">=</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379;">&quot;xx-small&quot;</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">&gt;</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">  xx-small  </span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">&lt;/</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75;">ds-card</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><div class="language-html line-numbers-mode" data-highlighter="shiki" data-ext="html" data-title="html" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">&lt;</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75;">ds-card</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66;"> space</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">=</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379;">&quot;xx-large&quot;</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">&gt;</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">  xx-large  </span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">&lt;/</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75;">ds-card</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="cards-with-footer" tabindex="-1"><a class="header-anchor" href="#cards-with-footer"><span>Cards with footer</span></a></h2><p>Most commonly the footer will contain some actions connected to the content.</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>&lt;ds-flex gutter=&quot;base&quot; :width=&quot;{ base: &#39;100%&#39;, sm: 1 }&quot;&gt;</span></span>
<span class="line"><span>  &lt;ds-flex-item&gt;</span></span>
<span class="line"><span>    &lt;ds-card</span></span>
<span class="line"><span>      header=&quot;The header&quot;&gt;</span></span>
<span class="line"><span>      Look ma! I&#39;m in a card.</span></span>
<span class="line"><span>      &lt;template slot=&quot;footer&quot;&gt;</span></span>
<span class="line"><span>        &lt;ds-button primary&gt;Read more&lt;/ds-button&gt;</span></span>
<span class="line"><span>      &lt;/template&gt;</span></span>
<span class="line"><span>    &lt;/ds-card&gt;</span></span>
<span class="line"><span>  &lt;/ds-flex-item&gt;</span></span>
<span class="line"><span>  &lt;ds-flex-item&gt;</span></span>
<span class="line"><span>    &lt;ds-card</span></span>
<span class="line"><span>      header=&quot;The header&quot;&gt;</span></span>
<span class="line"><span>      Look ma! I&#39;m in a card.</span></span>
<span class="line"><span>      &lt;template slot=&quot;footer&quot;&gt;</span></span>
<span class="line"><span>        &lt;ds-button primary&gt;Read more&lt;/ds-button&gt;</span></span>
<span class="line"><span>      &lt;/template&gt;</span></span>
<span class="line"><span>    &lt;/ds-card&gt;</span></span>
<span class="line"><span>  &lt;/ds-flex-item&gt;</span></span>
<span class="line"><span>&lt;/ds-flex&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="centered-content" tabindex="-1"><a class="header-anchor" href="#centered-content"><span>Centered content</span></a></h2><p>Center the content if it is short and its purpose is to draw attention rather than to share information.</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>&lt;ds-flex gutter=&quot;base&quot; :width=&quot;{ base: &#39;100%&#39;, sm: 1 }&quot;&gt;</span></span>
<span class="line"><span>  &lt;ds-flex-item&gt;</span></span>
<span class="line"><span>    &lt;ds-card</span></span>
<span class="line"><span>      centered</span></span>
<span class="line"><span>      header=&quot;The header&quot;&gt;</span></span>
<span class="line"><span>      Look ma! I&#39;m in a card.</span></span>
<span class="line"><span>      &lt;template slot=&quot;footer&quot;&gt;</span></span>
<span class="line"><span>        &lt;ds-button primary&gt;Read more&lt;/ds-button&gt;</span></span>
<span class="line"><span>      &lt;/template&gt;</span></span>
<span class="line"><span>    &lt;/ds-card&gt;</span></span>
<span class="line"><span>  &lt;/ds-flex-item&gt;</span></span>
<span class="line"><span>  &lt;ds-flex-item&gt;</span></span>
<span class="line"><span>    &lt;ds-card</span></span>
<span class="line"><span>      centered</span></span>
<span class="line"><span>      header=&quot;The header&quot;&gt;</span></span>
<span class="line"><span>      Look ma! I&#39;m in a card.</span></span>
<span class="line"><span>      &lt;template slot=&quot;footer&quot;&gt;</span></span>
<span class="line"><span>        &lt;ds-button primary&gt;Read more&lt;/ds-button&gt;</span></span>
<span class="line"><span>      &lt;/template&gt;</span></span>
<span class="line"><span>    &lt;/ds-card&gt;</span></span>
<span class="line"><span>  &lt;/ds-flex-item&gt;</span></span>
<span class="line"><span>&lt;/ds-flex&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="icon-card" tabindex="-1"><a class="header-anchor" href="#icon-card"><span>Icon card</span></a></h2><p>A card can contain an icon to emphasize its message.</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>&lt;ds-flex gutter=&quot;base&quot; :width=&quot;{ base: &#39;100%&#39;, sm: 1 }&quot;&gt;</span></span>
<span class="line"><span>  &lt;ds-flex-item&gt;</span></span>
<span class="line"><span>    &lt;ds-card</span></span>
<span class="line"><span>      centered</span></span>
<span class="line"><span>      icon=&quot;map&quot;</span></span>
<span class="line"><span>      header=&quot;The header&quot;&gt;</span></span>
<span class="line"><span>      Look ma! I&#39;m in a card.</span></span>
<span class="line"><span>      &lt;template slot=&quot;footer&quot;&gt;</span></span>
<span class="line"><span>        &lt;ds-button primary&gt;Read more&lt;/ds-button&gt;</span></span>
<span class="line"><span>      &lt;/template&gt;</span></span>
<span class="line"><span>    &lt;/ds-card&gt;</span></span>
<span class="line"><span>  &lt;/ds-flex-item&gt;</span></span>
<span class="line"><span>  &lt;ds-flex-item&gt;</span></span>
<span class="line"><span>    &lt;ds-card</span></span>
<span class="line"><span>      centered</span></span>
<span class="line"><span>      icon=&quot;users&quot;</span></span>
<span class="line"><span>      header=&quot;The header&quot;&gt;</span></span>
<span class="line"><span>      Look ma! I&#39;m in a card.</span></span>
<span class="line"><span>      &lt;template slot=&quot;footer&quot;&gt;</span></span>
<span class="line"><span>        &lt;ds-button primary&gt;Read more&lt;/ds-button&gt;</span></span>
<span class="line"><span>      &lt;/template&gt;</span></span>
<span class="line"><span>    &lt;/ds-card&gt;</span></span>
<span class="line"><span>  &lt;/ds-flex-item&gt;</span></span>
<span class="line"><span>&lt;/ds-flex&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="color-variants" tabindex="-1"><a class="header-anchor" href="#color-variants"><span>Color variants</span></a></h2><p>Use color variants to highlight content.</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>&lt;ds-flex gutter=&quot;base&quot; :width=&quot;{ base: &#39;100%&#39;, sm: 1 }&quot;&gt;</span></span>
<span class="line"><span>  &lt;ds-flex-item&gt;</span></span>
<span class="line"><span>    &lt;ds-card</span></span>
<span class="line"><span>      icon=&quot;cubes&quot;</span></span>
<span class="line"><span>      header=&quot;The header&quot;</span></span>
<span class="line"><span>      primary</span></span>
<span class="line"><span>      centered&gt;</span></span>
<span class="line"><span>      Look ma! I&#39;m in a card.</span></span>
<span class="line"><span>      &lt;template slot=&quot;footer&quot;&gt;</span></span>
<span class="line"><span>        &lt;ds-button&gt;Read more&lt;/ds-button&gt;</span></span>
<span class="line"><span>      &lt;/template&gt;</span></span>
<span class="line"><span>    &lt;/ds-card&gt;</span></span>
<span class="line"><span>  &lt;/ds-flex-item&gt;</span></span>
<span class="line"><span>  &lt;ds-flex-item&gt;</span></span>
<span class="line"><span>    &lt;ds-card</span></span>
<span class="line"><span>      icon=&quot;book&quot;</span></span>
<span class="line"><span>      header=&quot;The header&quot;</span></span>
<span class="line"><span>      secondary</span></span>
<span class="line"><span>      centered&gt;</span></span>
<span class="line"><span>      Look ma! I&#39;m in a card.</span></span>
<span class="line"><span>      &lt;template slot=&quot;footer&quot;&gt;</span></span>
<span class="line"><span>        &lt;ds-button secondary&gt;Read more&lt;/ds-button&gt;</span></span>
<span class="line"><span>      &lt;/template&gt;</span></span>
<span class="line"><span>    &lt;/ds-card&gt;</span></span>
<span class="line"><span>  &lt;/ds-flex-item&gt;</span></span>
<span class="line"><span>&lt;/ds-flex&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="hover-cards" tabindex="-1"><a class="header-anchor" href="#hover-cards"><span>Hover cards</span></a></h2><p>Use a hover card to draw additional attention to the its content.</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>&lt;ds-flex gutter=&quot;base&quot; :width=&quot;{ base: &#39;100%&#39;, sm: 1 }&quot;&gt;</span></span>
<span class="line"><span>  &lt;ds-flex-item&gt;</span></span>
<span class="line"><span>    &lt;ds-card</span></span>
<span class="line"><span>      icon=&quot;cubes&quot;</span></span>
<span class="line"><span>      header=&quot;The header&quot;</span></span>
<span class="line"><span>      primary</span></span>
<span class="line"><span>      centered</span></span>
<span class="line"><span>      hover&gt;</span></span>
<span class="line"><span>      Look ma! I&#39;m in a card.</span></span>
<span class="line"><span>      &lt;template slot=&quot;footer&quot;&gt;</span></span>
<span class="line"><span>        &lt;ds-button&gt;Read more&lt;/ds-button&gt;</span></span>
<span class="line"><span>      &lt;/template&gt;</span></span>
<span class="line"><span>    &lt;/ds-card&gt;</span></span>
<span class="line"><span>  &lt;/ds-flex-item&gt;</span></span>
<span class="line"><span>  &lt;ds-flex-item&gt;</span></span>
<span class="line"><span>    &lt;ds-card</span></span>
<span class="line"><span>      icon=&quot;book&quot;</span></span>
<span class="line"><span>      header=&quot;The header&quot;</span></span>
<span class="line"><span>      secondary</span></span>
<span class="line"><span>      centered</span></span>
<span class="line"><span>      hover&gt;</span></span>
<span class="line"><span>      Look ma! I&#39;m in a card.</span></span>
<span class="line"><span>      &lt;template slot=&quot;footer&quot;&gt;</span></span>
<span class="line"><span>        &lt;ds-button secondary&gt;Read more&lt;/ds-button&gt;</span></span>
<span class="line"><span>      &lt;/template&gt;</span></span>
<span class="line"><span>    &lt;/ds-card&gt;</span></span>
<span class="line"><span>  &lt;/ds-flex-item&gt;</span></span>
<span class="line"><span>&lt;/ds-flex&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="section-footer" tabindex="-1"><a class="header-anchor" href="#section-footer"><span>Section Footer</span></a></h2><p>Here we apply a section footer without margin</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>&lt;ds-flex gutter=&quot;base&quot; :width=&quot;{ base: &#39;100%&#39;, sm: 1 }&quot;&gt;</span></span>
<span class="line"><span>  &lt;ds-flex-item&gt;</span></span>
<span class="line"><span>    &lt;ds-card</span></span>
<span class="line"><span>      icon=&quot;cubes&quot;</span></span>
<span class="line"><span>      header=&quot;The header&quot;</span></span>
<span class="line"><span>      centered</span></span>
<span class="line"><span>      hover&gt;</span></span>
<span class="line"><span>      Look ma! I&#39;m in a card.</span></span>
<span class="line"><span>      &lt;div slot=&quot;footer&quot; class=&quot;no-margin&quot;&gt;</span></span>
<span class="line"><span>        &lt;ds-icon name=&quot;comments&quot; /&gt;</span></span>
<span class="line"><span>        &lt;ds-tag</span></span>
<span class="line"><span>          style=&quot;margin-top: -4px; margin-left: -7px; position: absolute;&quot;</span></span>
<span class="line"><span>          color=&quot;primary&quot;</span></span>
<span class="line"><span>          size=&quot;small&quot;</span></span>
<span class="line"><span>          round&gt;</span></span>
<span class="line"><span>          2</span></span>
<span class="line"><span>        &lt;/ds-tag&gt;</span></span>
<span class="line"><span>      &lt;/div&gt;</span></span>
<span class="line"><span>    &lt;/ds-card&gt;</span></span>
<span class="line"><span>  &lt;/ds-flex-item&gt;</span></span>
<span class="line"><span>  &lt;ds-flex-item&gt;</span></span>
<span class="line"><span>    &lt;ds-card</span></span>
<span class="line"><span>      icon=&quot;book&quot;</span></span>
<span class="line"><span>      header=&quot;The header&quot;</span></span>
<span class="line"><span>      centered&gt;</span></span>
<span class="line"><span>      Look ma! I&#39;m in a card.</span></span>
<span class="line"><span>      &lt;div slot=&quot;footer&quot; class=&quot;no-margin&quot;&gt;</span></span>
<span class="line"><span>        &lt;ds-icon name=&quot;comments&quot; /&gt;</span></span>
<span class="line"><span>        &lt;ds-tag</span></span>
<span class="line"><span>          style=&quot;margin-top: -4px; margin-left: -7px; position: absolute;&quot;</span></span>
<span class="line"><span>          color=&quot;primary&quot;</span></span>
<span class="line"><span>          size=&quot;small&quot;</span></span>
<span class="line"><span>          round&gt;</span></span>
<span class="line"><span>          34</span></span>
<span class="line"><span>        &lt;/ds-tag&gt;</span></span>
<span class="line"><span>      &lt;/div&gt;</span></span>
<span class="line"><span>    &lt;/ds-card&gt;</span></span>
<span class="line"><span>  &lt;/ds-flex-item&gt;</span></span>
<span class="line"><span>&lt;/ds-flex&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>`,25)]))}const r=n(l,[["render",p],["__file","demo.html.vue"]]),o=JSON.parse(`{"path":"/styleguide/src/system/components/layout/Card/demo.html","title":"","lang":"en-US","frontmatter":{},"headers":[{"level":2,"title":"Common usage","slug":"common-usage","link":"#common-usage","children":[]},{"level":2,"title":"Space","slug":"space","link":"#space","children":[]},{"level":2,"title":"Cards with footer","slug":"cards-with-footer","link":"#cards-with-footer","children":[]},{"level":2,"title":"Centered content","slug":"centered-content","link":"#centered-content","children":[]},{"level":2,"title":"Icon card","slug":"icon-card","link":"#icon-card","children":[]},{"level":2,"title":"Color variants","slug":"color-variants","link":"#color-variants","children":[]},{"level":2,"title":"Hover cards","slug":"hover-cards","link":"#hover-cards","children":[]},{"level":2,"title":"Section Footer","slug":"section-footer","link":"#section-footer","children":[]}],"git":{"createdTime":1772453486000,"updatedTime":1772453486000,"contributors":[{"name":"Moriz Wahl","email":"moriz.wahl@gmx.de","commits":1}]},"readingTime":{"minutes":2.34,"words":702},"filePathRelative":"styleguide/src/system/components/layout/Card/demo.md","localizedDate":"March 2, 2026","excerpt":"<h2>Common usage</h2>\\n<p>Set a header and image for the card and provide some content.</p>\\n<div class=\\"language- line-numbers-mode\\" data-highlighter=\\"shiki\\" data-ext=\\"\\" data-title=\\"\\" style=\\"--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34\\"><pre class=\\"shiki shiki-themes one-light one-dark-pro vp-code\\"><code><span class=\\"line\\"><span>&lt;ds-flex gutter=\\"base\\" :width=\\"{ base: '100%', sm: 1 }\\"&gt;</span></span>\\n<span class=\\"line\\"><span>  &lt;ds-flex-item&gt;</span></span>\\n<span class=\\"line\\"><span>    &lt;ds-card</span></span>\\n<span class=\\"line\\"><span>      header=\\"The header\\"</span></span>\\n<span class=\\"line\\"><span>      image=\\"https://picsum.photos/400/300?image=1063\\"&gt;</span></span>\\n<span class=\\"line\\"><span>      Look ma! I'm in a card.</span></span>\\n<span class=\\"line\\"><span>    &lt;/ds-card&gt;</span></span>\\n<span class=\\"line\\"><span>  &lt;/ds-flex-item&gt;</span></span>\\n<span class=\\"line\\"><span>  &lt;ds-flex-item&gt;</span></span>\\n<span class=\\"line\\"><span>    &lt;ds-card</span></span>\\n<span class=\\"line\\"><span>      header=\\"The header\\"</span></span>\\n<span class=\\"line\\"><span>      image=\\"https://picsum.photos/400/300?image=260\\"&gt;</span></span>\\n<span class=\\"line\\"><span>      Look ma! I'm in a card.</span></span>\\n<span class=\\"line\\"><span>    &lt;/ds-card&gt;</span></span>\\n<span class=\\"line\\"><span>  &lt;/ds-flex-item&gt;</span></span>\\n<span class=\\"line\\"><span>&lt;/ds-flex&gt;</span></span></code></pre>\\n<div class=\\"line-numbers\\" aria-hidden=\\"true\\" style=\\"counter-reset:line-number 0\\"><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div></div></div>"}`);export{r as comp,o as data};
