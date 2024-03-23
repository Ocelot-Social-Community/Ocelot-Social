import { Mention as TipTapMention } from 'tiptap-extensions'

export default class Mention extends TipTapMention {
  get name() {
    return 'mention'
  }

  get schema() {
    return {
      ...super.schema,
      toDOM: (node) => {
        return [
          'a',
          {
            class: this.options.mentionClass,
            href: `/profile/${node.attrs.id.hrefId}`,
            'data-mention-id':
              node.attrs.id.dataMentionId !== undefined ? node.attrs.id.dataMentionId : 'undefined',
            // better solution that doesn't work, see "webapp/components/Editor/Editor.vue" > "selectItem"
            // href: `/profile/${node.attrs.id}`,
            // 'data-mention-id': node.attrs.dataMentionId, // "dataMentionId" is undefined
            target: '_blank',
          },
          `${this.options.matcher.char}${node.attrs.label} `,
        ]
      },
      parseDOM: [
        // simply don't parse mentions from html
        // just treat them as normal links
      ],
    }
  }
}
