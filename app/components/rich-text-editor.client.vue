<script setup lang="ts">
import { Extension } from '@tiptap/core';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import EmojiPicker from 'vue3-emoji-picker';
import 'vue3-emoji-picker/css';

// ─── Props & v-model ──────────────────────────────────────────────────────────
const props = defineProps<{
  placeholder?: string;
}>();

// ─── Custom FontSize extension ────────────────────────────────────────────────
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: el => el.style.fontSize || null,
            renderHTML: (attrs) => {
              if (!attrs.fontSize)
                return {};
              return { style: `font-size: ${attrs.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (size: string) =>
          ({ chain }: any) =>
            chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize:
        () =>
          ({ chain }: any) =>
            chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    } as any;
  },
});

const model = defineModel<string>({ default: '' });

// ─── Font size options ────────────────────────────────────────────────────────
const fontSizeItems = [
  { label: 'Pequeño (12)', value: '12px' },
  { label: 'Normal (16)', value: '16px' },
  { label: 'Mediano (18)', value: '18px' },
  { label: 'Grande (24)', value: '24px' },
  { label: 'Título (32)', value: '32px' },
];
const selectedFontSize = ref('16px');

// ─── Emoji picker ─────────────────────────────────────────────────────────────
const showEmojiPicker = ref(false);

// ─── Link popover ─────────────────────────────────────────────────────────────
const showLinkPopover = ref(false);
const linkUrl = ref('');

// ─── Editor ───────────────────────────────────────────────────────────────────
const editor = useEditor({
  content: model.value,
  extensions: [
    StarterKit,
    Underline,
    Link.configure({ openOnClick: false }),
    TextStyle,
    FontSize,
    Placeholder.configure({
      placeholder: props.placeholder ?? 'Escribe aquí...',
    }),
  ] as any,
  onUpdate: ({ editor }) => {
    model.value = editor.getHTML();
  },
  onSelectionUpdate: ({ editor }) => {
    const fontSize = editor.getAttributes('textStyle').fontSize;
    selectedFontSize.value = fontSize || '16px';
  },
});

watch(model, (val) => {
  if (editor.value && editor.value.getHTML() !== val) {
    editor.value.commands.setContent(val);
  }
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});

// ─── Toolbar actions ──────────────────────────────────────────────────────────

/**
 * Wrapper que devuelve la cadena de comandos sin restricciones de tipo.
 *  Necesario por el conflicto de paths de @tiptap/core en las dependencias.
 */
function chain(): any {
  return editor.value?.chain().focus();
}

function isActive(name: string, attrs?: Record<string, unknown>) {
  return editor.value?.isActive(name, attrs) ?? false;
}

function applyFontSize(size: string | number | boolean | object) {
  const sizeStr = String(size);
  selectedFontSize.value = sizeStr;
  chain().setFontSize(sizeStr).run();
}

function openLinkPopover() {
  linkUrl.value = editor.value?.getAttributes('link').href ?? '';
  showLinkPopover.value = true;
}

function applyLink() {
  if (linkUrl.value === '') {
    chain().extendMarkRange('link').unsetLink().run();
  }
  else {
    chain().extendMarkRange('link').setLink({ href: linkUrl.value }).run();
  }
  showLinkPopover.value = false;
  linkUrl.value = '';
}

function onEmojiSelect(emoji: { i: string }) {
  chain().insertContent(emoji.i).run();
  showEmojiPicker.value = false;
}
</script>

<template>
  <div class="rich-editor border border-default rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-primary">
    <!-- Toolbar -->
    <div
      v-if="editor"
      class="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-default bg-elevated"
    >
      <!-- Tamaño de fuente -->
      <USelect
        :model-value="selectedFontSize"
        :items="fontSizeItems"
        size="xs"
        class="w-30"
        @update:model-value="applyFontSize"
      />

      <div class="w-px h-5 bg-default mx-1" />

      <!-- Negrita -->
      <UTooltip text="Negrita (Ctrl+B)">
        <UButton
          size="xs"
          variant="ghost"
          :color="isActive('bold') ? 'primary' : 'neutral'"
          icon="i-lucide-bold"
          @click="chain().toggleBold().run()"
        />
      </UTooltip>

      <!-- Cursiva -->
      <UTooltip text="Cursiva (Ctrl+I)">
        <UButton
          size="xs"
          variant="ghost"
          :color="isActive('italic') ? 'primary' : 'neutral'"
          icon="i-lucide-italic"
          @click="chain().toggleItalic().run()"
        />
      </UTooltip>

      <!-- Subrayado -->
      <UTooltip text="Subrayado (Ctrl+U)">
        <UButton
          size="xs"
          variant="ghost"
          :color="isActive('underline') ? 'primary' : 'neutral'"
          icon="i-lucide-underline"
          @click="chain().toggleUnderline().run()"
        />
      </UTooltip>

      <!-- Tachado -->
      <UTooltip text="Tachado">
        <UButton
          size="xs"
          variant="ghost"
          :color="isActive('strike') ? 'primary' : 'neutral'"
          icon="i-lucide-strikethrough"
          @click="chain().toggleStrike().run()"
        />
      </UTooltip>

      <div class="w-px h-5 bg-default mx-1" />

      <!-- Lista con viñetas -->
      <UTooltip text="Lista con viñetas">
        <UButton
          size="xs"
          variant="ghost"
          :color="isActive('bulletList') ? 'primary' : 'neutral'"
          icon="i-lucide-list"
          @click="chain().toggleBulletList().run()"
        />
      </UTooltip>

      <!-- Lista numerada -->
      <UTooltip text="Lista numerada">
        <UButton
          size="xs"
          variant="ghost"
          :color="isActive('orderedList') ? 'primary' : 'neutral'"
          icon="i-lucide-list-ordered"
          @click="chain().toggleOrderedList().run()"
        />
      </UTooltip>

      <div class="w-px h-5 bg-default mx-1" />

      <!-- Enlace -->
      <UPopover v-model:open="showLinkPopover">
        <UTooltip text="Insertar enlace">
          <UButton
            size="xs"
            variant="ghost"
            :color="isActive('link') ? 'primary' : 'neutral'"
            icon="i-lucide-link"
            @click="openLinkPopover"
          />
        </UTooltip>
        <template #content>
          <div class="flex items-center gap-2 p-2">
            <UInput
              v-model="linkUrl"
              size="xs"
              placeholder="https://..."
              class="w-56"
              @keydown.enter="applyLink"
            />
            <UButton
              size="xs"
              color="primary"
              icon="i-lucide-check"
              @click="applyLink"
            />
          </div>
        </template>
      </UPopover>

      <!-- Emojis -->
      <UPopover v-model:open="showEmojiPicker">
        <UTooltip text="Insertar emoji">
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-smile"
          />
        </UTooltip>
        <template #content>
          <EmojiPicker
            :native="true"
            :disable-skin-tones="true"
            @select="onEmojiSelect"
          />
        </template>
      </UPopover>
    </div>

    <!-- Área de edición -->
    <EditorContent
      :editor="editor"
      class="rich-editor-content"
    />
  </div>
</template>

<style scoped>
.rich-editor-content :deep(.tiptap) {
  min-height: 140px;
  padding: 0.625rem 0.75rem;
  outline: none;
  font-size: 16px;
  line-height: 1.65;
}

/* Placeholder */
.rich-editor-content :deep(.tiptap p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  color: var(--ui-text-muted);
  pointer-events: none;
  float: left;
  height: 0;
}

/* Listas */
.rich-editor-content :deep(.tiptap ul) {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin: 0.25rem 0;
}
.rich-editor-content :deep(.tiptap ol) {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin: 0.25rem 0;
}
.rich-editor-content :deep(.tiptap li) {
  margin: 0.1rem 0;
}

/* Marcas de texto */
.rich-editor-content :deep(.tiptap strong) {
  font-weight: 700;
}
.rich-editor-content :deep(.tiptap em) {
  font-style: italic;
}
.rich-editor-content :deep(.tiptap u) {
  text-decoration: underline;
}
.rich-editor-content :deep(.tiptap s) {
  text-decoration: line-through;
}

/* Párrafos */
.rich-editor-content :deep(.tiptap p) {
  margin: 0.15rem 0;
}

/* Enlace */
.rich-editor-content :deep(.tiptap a) {
  color: var(--ui-primary);
  text-decoration: underline;
  cursor: pointer;
}
.rich-editor-content :deep(.tiptap a:hover) {
  opacity: 0.8;
}
</style>
