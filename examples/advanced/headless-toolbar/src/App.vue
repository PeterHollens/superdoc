<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { SuperDoc } from 'superdoc';
import {
  createHeadlessToolbar,
  headlessToolbarConstants,
  headlessToolbarHelpers,
  type ToolbarSnapshot,
} from 'superdoc/headless-toolbar';
import 'superdoc/style.css';

const editorContainer = ref<HTMLDivElement | null>(null);
const snapshot = shallowRef<ToolbarSnapshot>({
  context: null,
  commands: {
    bold: { active: false, disabled: true },
    italic: { active: false, disabled: true },
    underline: { active: false, disabled: true },
    strikethrough: { active: false, disabled: true },
    'font-family': { active: false, disabled: true, value: null },
    'font-size': { active: false, disabled: true, value: null },
    'text-color': { active: false, disabled: true, value: null },
    'highlight-color': { active: false, disabled: true, value: null },
    link: { active: false, disabled: true, value: null },
    'linked-style': { active: false, disabled: true, value: null },
    'table-insert': { active: false, disabled: true },
    'table-add-row-before': { active: false, disabled: true },
    'table-add-row-after': { active: false, disabled: true },
    'table-delete-row': { active: false, disabled: true },
    'table-add-column-before': { active: false, disabled: true },
    'table-add-column-after': { active: false, disabled: true },
    'table-delete-column': { active: false, disabled: true },
    'table-delete': { active: false, disabled: true },
    'table-merge-cells': { active: false, disabled: true },
    'table-split-cell': { active: false, disabled: true },
    'table-remove-borders': { active: false, disabled: true },
    'table-fix': { active: false, disabled: true },
    'clear-formatting': { active: false, disabled: true },
    'copy-format': { active: false, disabled: true },
    image: { active: false, disabled: true },
    'bullet-list': { active: false, disabled: true },
    'numbered-list': { active: false, disabled: true },
    'indent-increase': { active: false, disabled: true },
    'indent-decrease': { active: false, disabled: true },
    ruler: { active: false, disabled: true },
    zoom: { active: false, disabled: true, value: null },
    'document-mode': { active: false, disabled: true, value: null },
    undo: { active: false, disabled: true },
    redo: { active: false, disabled: true },
    'text-align': { active: false, disabled: true, value: null },
    'line-height': { active: false, disabled: true, value: null },
  },
});

const fontFamilyOptions = headlessToolbarConstants.DEFAULT_FONT_FAMILY_OPTIONS;
const fontSizeOptions = headlessToolbarConstants.DEFAULT_FONT_SIZE_OPTIONS;
const textColorOptions = [
  { label: 'Black', value: '#000000' },
  { label: 'Red', value: '#ff0000' },
  { label: 'Blue', value: '#0000ff' },
];
const highlightColorOptions = [
  { label: 'Yellow', value: '#ffff00' },
  { label: 'Green', value: '#00ff00' },
  { label: 'Cyan', value: '#00ffff' },
  { label: 'None', value: 'none' },
];
const tableActionOptions = [
  { label: 'Row Above', value: 'table-add-row-before' },
  { label: 'Row Below', value: 'table-add-row-after' },
  { label: 'Delete Row', value: 'table-delete-row' },
  { label: 'Column Left', value: 'table-add-column-before' },
  { label: 'Column Right', value: 'table-add-column-after' },
  { label: 'Delete Column', value: 'table-delete-column' },
  { label: 'Delete Table', value: 'table-delete' },
  { label: 'Merge Cells', value: 'table-merge-cells' },
  { label: 'Split Cell', value: 'table-split-cell' },
  { label: 'Remove Borders', value: 'table-remove-borders' },
  { label: 'Fix Tables', value: 'table-fix' },
] as const;
const textAlignOptions = headlessToolbarConstants.DEFAULT_TEXT_ALIGN_OPTIONS;
const lineHeightOptions = headlessToolbarConstants.DEFAULT_LINE_HEIGHT_OPTIONS;
const zoomOptions = headlessToolbarConstants.DEFAULT_ZOOM_OPTIONS;
const documentModeOptions = headlessToolbarConstants.DEFAULT_DOCUMENT_MODE_OPTIONS;
const isTableActionsOpen = ref(false);
const isLinkedStylesOpen = ref(false);
const isLinkOpen = ref(false);
const linkUrl = ref('');

const activeEditor = computed(() => {
  const context = snapshot.value.context;
  return context?.presentationEditor?.getActiveEditor?.() ?? context?.editor ?? null;
});

const linkedStyleOptions = computed(() => {
  const editor = activeEditor.value;
  return editor ? (headlessToolbarHelpers.getQuickFormatList(editor)) : [];
});

const selectedLinkedStyleId = computed(() => {
  const value = snapshot.value.commands['linked-style']?.value;
  return typeof value === 'string' ? value : null;
});

const linkedStyleLabel = computed(() => {
  const selectedStyle = linkedStyleOptions.value.find((style) => style.id === selectedLinkedStyleId.value);
  if (!selectedStyle || selectedStyle.id === 'Normal') return 'Format text';
  return selectedStyle.definition?.attrs?.name ?? 'Format text';
});

const currentLinkHref = computed(() => {
  const value = snapshot.value.commands.link?.value;
  return typeof value === 'string' ? value : '';
});

let superdoc: SuperDoc | null = null;
let unsubscribeToolbar: (() => void) | null = null;
let toolbarController: {
  destroy(): void;
  getSnapshot(): ToolbarSnapshot;
  subscribe(listener: (event: { snapshot: ToolbarSnapshot }) => void): () => void;
  execute(id: string, payload?: unknown): boolean;
} | null = null;

const handleBoldClick = () => {
  // snapshot.value.context?.target?.commands?.toggleBold?.();
  toolbarController?.execute('bold');
};

const handleItalicClick = () => {
  // snapshot.value.context?.target?.commands?.toggleItalic?.();
  toolbarController?.execute('italic');
};

const handleUnderlineClick = () => {
  // snapshot.value.context?.target?.commands?.toggleUnderline?.();
  toolbarController?.execute('underline');
};

const handleStrikethroughClick = () => {
  snapshot.value.context?.target?.commands?.toggleStrike?.();
};

const handleFontFamilyChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value;
  if (!value) return;
  toolbarController?.execute('font-family', value);
};

const handleFontSizeChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value;
  if (!value) return;
  // snapshot.value.context?.target?.commands?.setFontSize?.(value);
  toolbarController?.execute('font-size', value);
};

const handleTextColorChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value;
  if (!value) return;
  toolbarController?.execute('text-color', value);
};

const handleHighlightColorChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value;
  if (!value) return;
  toolbarController?.execute('highlight-color', value);
};

const handleUndoClick = () => {
  toolbarController?.execute('undo');
};

const handleRedoClick = () => {
  toolbarController?.execute('redo');
};

const handleZoomChange = (event: Event) => {
  const value = Number((event.target as HTMLSelectElement).value);
  if (!value) return;
  toolbarController?.execute('zoom', value);
};

const handleClearFormattingClick = () => {
  toolbarController?.execute('clear-formatting');
};

const handleCopyFormatClick = () => {
  toolbarController?.execute('copy-format');
};

const handleImageClick = async () => {
  const editor = activeEditor.value;
  if (!editor) return;

  try {
    const open = headlessToolbarHelpers.getFileOpener();
    const result = await open();

    if (!result?.file) {
      return;
    }

    await headlessToolbarHelpers.processAndInsertImageFile({
      file: result.file,
      editor,
      view: editor.view,
      editorOptions: editor.options,
      getMaxContentSize: () => editor.getMaxContentSize(),
    });
  } catch (error) {
    console.error('[headless-toolbar demo] Image upload failed', error);
  }
};

const handleBulletListClick = () => {
  toolbarController?.execute('bullet-list');
};

const handleNumberedListClick = () => {
  toolbarController?.execute('numbered-list');
};

const handleIndentIncreaseClick = () => {
  toolbarController?.execute('indent-increase');
};

const handleIndentDecreaseClick = () => {
  toolbarController?.execute('indent-decrease');
};

const handleRulerClick = () => {
  toolbarController?.execute('ruler');
};

const handleDocumentModeChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value;
  if (!value) return;
  toolbarController?.execute('document-mode', value);
};

const handleTableInsertClick = () => {
  toolbarController?.execute('table-insert', { rows: 3, cols: 3 });
};

const handleTableActionClick = (id: (typeof tableActionOptions)[number]['value']) => {
  toolbarController?.execute(id);
  isTableActionsOpen.value = false;
};

const handleTextAlignChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value as 'left' | 'center' | 'right' | 'justify';
  if (!value) return;
  snapshot.value.context?.target?.commands?.setTextAlign?.(value);
};

const handleLineHeightChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value;
  if (!value) return;
  snapshot.value.context?.target?.commands?.setLineHeight?.(Number(value));
};

const handleLinkedStyleClick = (style: LinkedStyleOption) => {
  toolbarController?.execute('linked-style', style);
  isLinkedStylesOpen.value = false;
};

const handleLinkToggle = () => {
  linkUrl.value = currentLinkHref.value;
  isLinkOpen.value = !isLinkOpen.value;
};

const handleLinkApply = () => {
  if (!linkUrl.value) {
    return;
  }

  toolbarController?.execute('link', {
    href: linkUrl.value,
  });
  isLinkOpen.value = false;
};

const handleLinkRemove = () => {
  toolbarController?.execute('link', { href: null });
  isLinkOpen.value = false;
};

onMounted(() => {
  if (!editorContainer.value) return;

  superdoc = new SuperDoc({
    selector: editorContainer.value,
    document: '/test_file.docx',
    toolbar: null,
  });
  window.superdoc = superdoc;

  toolbarController = createHeadlessToolbar({
    superdoc,
    commands: [
      'bold',
      'italic',
      'underline',
      'strikethrough',
      'font-family',
      'font-size',
      'text-color',
      'highlight-color',
      'link',
      'linked-style',
      'table-insert',
      'table-add-row-before',
      'table-add-row-after',
      'table-delete-row',
      'table-add-column-before',
      'table-add-column-after',
      'table-delete-column',
      'table-delete',
      'table-merge-cells',
      'table-split-cell',
      'table-remove-borders',
      'table-fix',
      'bullet-list',
      'numbered-list',
      'indent-increase',
      'indent-decrease',
      'clear-formatting',
      'copy-format',
      'image',
      'ruler',
      'zoom',
      'document-mode',
      'undo',
      'redo',
      'text-align',
      'line-height',
    ],
  });

  snapshot.value = toolbarController.getSnapshot();
  unsubscribeToolbar = toolbarController.subscribe(({ snapshot: nextSnapshot }) => {
    snapshot.value = nextSnapshot;
  });
});

onBeforeUnmount(() => {
  unsubscribeToolbar?.();
  toolbarController?.destroy?.();
  superdoc?.destroy?.();
});
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div>
        <p class="eyebrow">Advanced Example</p>
        <h1>Headless Toolbar</h1>
      </div>
      <p class="intro">
        This toolbar is fully customer-owned UI. SuperDoc only provides headless state and command access.
      </p>
    </header>

    <main class="workspace">
      <div class="toolbar-floating">
        <div class="toolbar-row">
          <button
            class="toolbar-button"
            :class="{ 'toolbar-button-active': snapshot.commands.bold?.active }"
            :disabled="snapshot.commands.bold?.disabled"
            type="button"
            @click="handleBoldClick"
          >
            Bold
          </button>
          <button
            class="toolbar-button"
            :class="{ 'toolbar-button-active': snapshot.commands.italic?.active }"
            :disabled="snapshot.commands.italic?.disabled"
            type="button"
            @click="handleItalicClick"
          >
            Italic
          </button>
          <button
            class="toolbar-button"
            :class="{ 'toolbar-button-active': snapshot.commands.underline?.active }"
            :disabled="snapshot.commands.underline?.disabled"
            type="button"
            @click="handleUnderlineClick"
          >
            Underline
          </button>
          <button
            class="toolbar-button"
            :class="{ 'toolbar-button-active': snapshot.commands.strikethrough?.active }"
            :disabled="snapshot.commands.strikethrough?.disabled"
            type="button"
            @click="handleStrikethroughClick"
          >
            Strikethrough
          </button>
          <label class="toolbar-field">
            <span class="toolbar-field-label">Font family</span>
            <select
              class="toolbar-select"
              :disabled="snapshot.commands['font-family']?.disabled"
              :value="String(snapshot.commands['font-family']?.value ?? '')"
              @change="handleFontFamilyChange"
            >
              <option v-for="option in fontFamilyOptions" :key="option.value" :value="option.label">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="toolbar-field">
            <span class="toolbar-field-label">Font size</span>
            <select
              class="toolbar-select"
              :disabled="snapshot.commands['font-size']?.disabled"
              :value="String(snapshot.commands['font-size']?.value ?? '')"
              @change="handleFontSizeChange"
            >
              <option v-for="option in fontSizeOptions" :key="option.value" :value="option.label">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="toolbar-field">
            <span class="toolbar-field-label">Text color</span>
            <select
              class="toolbar-select"
              :disabled="snapshot.commands['text-color']?.disabled"
              :value="String(snapshot.commands['text-color']?.value ?? '').toLowerCase()"
              @change="handleTextColorChange"
            >
              <option v-for="option in textColorOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="toolbar-field">
            <span class="toolbar-field-label">Highlight</span>
            <select
              class="toolbar-select"
              :disabled="snapshot.commands['highlight-color']?.disabled"
              :value="String(snapshot.commands['highlight-color']?.value ?? '').toLowerCase()"
              @change="handleHighlightColorChange"
            >
              <option v-for="option in highlightColorOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <div class="toolbar-dropdown">
            <button
              class="toolbar-button toolbar-button-compact"
              :class="{ 'toolbar-button-active': snapshot.commands.link?.active }"
              :disabled="snapshot.commands.link?.disabled"
              type="button"
              @click="handleLinkToggle"
            >
              Link
            </button>
            <div v-if="isLinkOpen" class="toolbar-dropdown-menu toolbar-link-menu">
              <label class="toolbar-link-field">
                <span class="toolbar-field-label">URL</span>
                <input v-model="linkUrl" class="toolbar-link-input" type="text" placeholder="https://example.com" />
              </label>
              <div class="toolbar-link-actions">
                <button class="toolbar-button toolbar-button-compact" type="button" :disabled="!linkUrl" @click="handleLinkApply">
                  Apply
                </button>
                <button
                  v-if="snapshot.commands.link?.active"
                  class="toolbar-button toolbar-button-compact"
                  type="button"
                  @click="handleLinkRemove"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="toolbar-row toolbar-row-secondary">
          <button
            class="toolbar-button toolbar-button-compact"
            :disabled="snapshot.commands['table-insert']?.disabled"
            type="button"
            @click="handleTableInsertClick"
          >
            Table 3x3
          </button>
          <div class="toolbar-dropdown">
            <button
              class="toolbar-button toolbar-button-compact"
              :disabled="tableActionOptions.every((option) => snapshot.commands[option.value]?.disabled !== false)"
              type="button"
              @click="isTableActionsOpen = !isTableActionsOpen"
            >
              Table Actions
            </button>
            <div v-if="isTableActionsOpen" class="toolbar-dropdown-menu">
              <button
                v-for="option in tableActionOptions"
                :key="option.value"
                class="toolbar-dropdown-item"
                :disabled="snapshot.commands[option.value]?.disabled"
                type="button"
                @click="handleTableActionClick(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
          <label class="toolbar-field">
            <span class="toolbar-field-label">Text align</span>
            <select
              class="toolbar-select"
              :disabled="snapshot.commands['text-align']?.disabled"
              :value="String(snapshot.commands['text-align']?.value ?? '')"
              @change="handleTextAlignChange"
            >
              <option v-for="option in textAlignOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <button
            class="toolbar-button toolbar-button-compact"
            :class="{ 'toolbar-button-active': snapshot.commands['bullet-list']?.active }"
            :disabled="snapshot.commands['bullet-list']?.disabled"
            type="button"
            @click="handleBulletListClick"
          >
            Bullet List
          </button>
          <button
            class="toolbar-button toolbar-button-compact"
            :class="{ 'toolbar-button-active': snapshot.commands['numbered-list']?.active }"
            :disabled="snapshot.commands['numbered-list']?.disabled"
            type="button"
            @click="handleNumberedListClick"
          >
            Numbered List
          </button>
          <button
            class="toolbar-button toolbar-button-compact"
            :disabled="snapshot.commands['indent-increase']?.disabled"
            type="button"
            @click="handleIndentIncreaseClick"
          >
            Indent +
          </button>
          <button
            class="toolbar-button toolbar-button-compact"
            :disabled="snapshot.commands['indent-decrease']?.disabled"
            type="button"
            @click="handleIndentDecreaseClick"
          >
            Indent -
          </button>
          <label class="toolbar-field">
            <span class="toolbar-field-label">Line height</span>
            <select
              class="toolbar-select"
              :disabled="snapshot.commands['line-height']?.disabled"
              :value="String(snapshot.commands['line-height']?.value ?? '')"
              @change="handleLineHeightChange"
            >
              <option v-for="option in lineHeightOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <div class="toolbar-dropdown">
            <button
              class="toolbar-button toolbar-button-compact"
              :disabled="snapshot.commands['linked-style']?.disabled || linkedStyleOptions.length === 0"
              type="button"
              @click="isLinkedStylesOpen = !isLinkedStylesOpen"
            >
              {{ linkedStyleLabel }}
            </button>
            <div v-if="isLinkedStylesOpen" class="toolbar-dropdown-menu toolbar-dropdown-menu-wide">
              <button
                v-for="style in linkedStyleOptions"
                :key="style.id"
                class="toolbar-dropdown-item toolbar-dropdown-item-linked-style"
                :class="{ 'toolbar-dropdown-item-active': selectedLinkedStyleId === style.id }"
                type="button"
                @click="handleLinkedStyleClick(style)"
              >
                <span
                  class="toolbar-linked-style-name"
                  :style="headlessToolbarHelpers.generateLinkedStyleString(style, null, null, false)"
                >
                  {{ style.definition?.attrs?.name ?? style.id }}
                </span>
              </button>
            </div>
          </div>
        </div>
        <div class="toolbar-row toolbar-row-secondary">
          <button
            class="toolbar-button toolbar-button-compact"
            :disabled="snapshot.commands.undo?.disabled"
            type="button"
            @click="handleUndoClick"
          >
            Undo
          </button>
          <button
            class="toolbar-button toolbar-button-compact"
            :disabled="snapshot.commands.redo?.disabled"
            type="button"
            @click="handleRedoClick"
          >
            Redo
          </button>
          <label class="toolbar-field">
            <span class="toolbar-field-label">Zoom</span>
            <select
              class="toolbar-select"
              :disabled="snapshot.commands.zoom?.disabled"
              :value="String(snapshot.commands.zoom?.value ?? '')"
              @change="handleZoomChange"
            >
              <option v-for="option in zoomOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <button
            class="toolbar-button toolbar-button-compact"
            :class="{ 'toolbar-button-active': snapshot.commands.ruler?.active }"
            :disabled="snapshot.commands.ruler?.disabled"
            type="button"
            @click="handleRulerClick"
          >
            Ruler
          </button>
          <button
            class="toolbar-button toolbar-button-compact"
            :disabled="snapshot.commands['copy-format']?.disabled"
            type="button"
            @click="handleCopyFormatClick"
          >
            Copy Format
          </button>
          <button
            class="toolbar-button toolbar-button-compact"
            :disabled="snapshot.commands.image?.disabled"
            type="button"
            @click="handleImageClick"
          >
            Image
          </button>
          <button
            class="toolbar-button toolbar-button-compact"
            :disabled="snapshot.commands['clear-formatting']?.disabled"
            type="button"
            @click="handleClearFormattingClick"
          >
            Clear Formatting
          </button>
          <label class="toolbar-field">
            <span class="toolbar-field-label">Document mode</span>
            <select
              class="toolbar-select"
              :disabled="snapshot.commands['document-mode']?.disabled"
              :value="String(snapshot.commands['document-mode']?.value ?? '')"
              @change="handleDocumentModeChange"
            >
              <option v-for="option in documentModeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>
      </div>

      <div ref="editorContainer" class="editor-host"></div>
    </main>
  </div>
</template>
