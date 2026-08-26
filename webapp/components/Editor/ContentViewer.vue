<template>
  <editor-content :editor="editor" :key="content" />
</template>

<script>
import defaultExtensions from './defaultExtensions.js'
import Hashtag from './nodes/Hashtag.js'
import { Editor, EditorContent } from 'tiptap'

export default {
  name: 'ContentViewer',
  components: {
    EditorContent,
  },
  props: {
    content: { type: String, default: '' },
    doc: { type: Object, default: () => {} },
  },
  data() {
    return {
      editor: new Editor({
        doc: this.doc,
        content: this.content,
        editable: false,
        extensions: [
          // Hashtags must come first, see
          // https://github.com/scrumpy/tiptap/issues/421#issuecomment-523037460
          new Hashtag(),
          ...defaultExtensions(this),
        ],
      }),
    }
  },
  beforeUpdate() {
    this.editor.setContent(this.content)
  },
  beforeDestroy() {
    this.editor.destroy()
  },
}
</script>
<style>
.ProseMirror h3,
.ProseMirror h4,
.ProseMirror hr {
  margin: 24px 0 8px;
}

/* Editor.vue's global .ProseMirror sets min-height: 100px so the editABLE
   form always has enough click area, even empty — that reservation makes no
   sense here on the read-only viewer, where it just pads short posts with
   trailing whitespace. contenteditable="false" (set via this component's own
   editable: false) is what tiptap/ProseMirror marks the read-only case with,
   giving a selector specific enough to win over the plain .ProseMirror rule
   regardless of stylesheet load order, without touching the real editor. */
.ProseMirror[contenteditable='false'] {
  min-height: 0;
}
</style>
