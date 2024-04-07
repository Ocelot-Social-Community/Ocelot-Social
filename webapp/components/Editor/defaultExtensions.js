import Embed from '~/components/Editor/nodes/Embed.js'
import LegacyEmbed from '~/components/Editor/nodes/LegacyEmbed.js'
import Link from '~/components/Editor/nodes/Link.js'
import Strike from '~/components/Editor/marks/Strike'
import Italic from '~/components/Editor/marks/Italic'
import Bold from '~/components/Editor/marks/Bold'
import EmbedQuery from '~/graphql/EmbedQuery.js'
import { Heading } from '@tiptap/extension-heading'
import { HardBreak } from '@tiptap/extension-hard-break'
import { Blockquote } from '@tiptap/extension-blockquote'
import { ListItem } from '@tiptap/extension-list-item'
import { BulletList } from '@tiptap/extension-bullet-list'
import { OrderedList } from '@tiptap/extension-ordered-list'
import { HorizontalRule } from '@tiptap/extension-horizontal-rule'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Underline } from '@tiptap/extension-underline'

export default function defaultExtensions(component) {
  const { placeholder, $t, $apollo } = component
  return [
    new Heading(),
    new HardBreak(),
    new Blockquote(),
    new BulletList(),
    new OrderedList(),
    new HorizontalRule(),
    new Bold(),
    new Italic(),
    new Strike(),
    new Underline(),
    new Link(),
    new Heading({ levels: [3, 4] }),
    new ListItem(),
    new Placeholder({
      emptyNodeClass: 'is-empty',
      emptyNodeText: placeholder || $t('editor.placeholder'),
    }),
    new Embed({
      onEmbed: async ({ url }) => {
        const {
          data: { embed },
        } = await $apollo.query({ query: EmbedQuery(), variables: { url } })
        return embed
      },
    }),
    new LegacyEmbed({
      onEmbed: async ({ url }) => {
        const {
          data: { embed },
        } = await $apollo.query({ query: EmbedQuery(), variables: { url } })
        return embed
      },
    }),
  ]
}
