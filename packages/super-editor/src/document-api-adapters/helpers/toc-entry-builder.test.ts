import { describe, expect, it } from 'vitest';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { buildTocEntryParagraphs, collectTocSources, type TocSource } from './toc-entry-builder.js';
import { generateTocBookmarkName } from './toc-bookmark-sync.js';
import type { TocSwitchConfig } from '@superdoc/document-api';

const BASE_SOURCE: TocSource = {
  text: 'Chapter One',
  level: 1,
  sdBlockId: 'h-1',
  kind: 'heading',
};

function makeConfig(display: TocSwitchConfig['display'] = {}): TocSwitchConfig {
  return {
    source: { outlineLevels: { from: 1, to: 3 } },
    display: { hyperlinks: true, ...display },
    preserved: {},
  };
}

function createTextNode(text: string): ProseMirrorNode {
  return {
    type: { name: 'text' },
    attrs: {},
    marks: [],
    text,
    nodeSize: text.length,
    content: { size: 0 },
    isText: true,
    isInline: true,
    isBlock: false,
    isLeaf: true,
    childCount: 0,
    child() {
      throw new Error('Text nodes do not have children.');
    },
    forEach() {
      // Text nodes do not expose children.
    },
    descendants() {
      // Text nodes do not expose descendants.
    },
  } as unknown as ProseMirrorNode;
}

function createParagraphNode(
  nodeId: string,
  text: string,
  paragraphProperties: Record<string, unknown> = {},
): ProseMirrorNode {
  const textNode = createTextNode(text);

  return {
    type: { name: 'paragraph' },
    attrs: {
      sdBlockId: nodeId,
      paraId: nodeId,
      paragraphProperties,
    },
    marks: [],
    nodeSize: textNode.nodeSize + 2,
    content: { size: textNode.nodeSize },
    isText: false,
    isInline: false,
    isBlock: true,
    inlineContent: true,
    isTextblock: true,
    isLeaf: false,
    childCount: 1,
    child(index: number) {
      if (index !== 0) throw new Error('Paragraph has only one child.');
      return textNode;
    },
    forEach(callback: (node: ProseMirrorNode, offset: number) => void) {
      callback(textNode, 0);
    },
    descendants(callback: (node: ProseMirrorNode, pos: number) => boolean | void) {
      callback(textNode, 0);
    },
  } as unknown as ProseMirrorNode;
}

function createDocNode(paragraphs: ProseMirrorNode[]): ProseMirrorNode {
  return {
    type: { name: 'doc' },
    attrs: {},
    marks: [],
    nodeSize: paragraphs.reduce((size, paragraph) => size + paragraph.nodeSize, 2),
    content: { size: paragraphs.reduce((size, paragraph) => size + paragraph.nodeSize, 0) },
    isText: false,
    isInline: false,
    isBlock: false,
    isLeaf: false,
    childCount: paragraphs.length,
    child(index: number) {
      const paragraph = paragraphs[index];
      if (!paragraph) throw new Error(`Doc does not have child at index ${index}.`);
      return paragraph;
    },
    forEach(callback: (node: ProseMirrorNode, offset: number) => void) {
      let offset = 0;
      paragraphs.forEach((paragraph) => {
        callback(paragraph, offset);
        offset += paragraph.nodeSize;
      });
    },
    descendants(callback: (node: ProseMirrorNode, pos: number) => boolean | void) {
      let offset = 0;
      paragraphs.forEach((paragraph) => {
        callback(paragraph, offset);
        offset += paragraph.nodeSize;
      });
    },
  } as unknown as ProseMirrorNode;
}

describe('buildTocEntryParagraphs', () => {
  describe('hyperlink anchors', () => {
    it('uses a _Toc bookmark name as the hyperlink anchor, not the raw sdBlockId', () => {
      const paragraphs = buildTocEntryParagraphs([BASE_SOURCE], makeConfig({ hyperlinks: true }));
      const textNode = paragraphs[0]!.content[0] as { marks?: Array<{ type: string; attrs: Record<string, unknown> }> };
      const linkMark = textNode.marks?.find((m) => m.type === 'link');

      expect(linkMark).toBeDefined();
      expect(linkMark!.attrs.anchor).toMatch(/^_Toc[a-zA-Z0-9_]+$/);
      expect(linkMark!.attrs.anchor).toBe(generateTocBookmarkName(BASE_SOURCE.sdBlockId));
      expect(linkMark!.attrs.anchor).not.toBe(BASE_SOURCE.sdBlockId);
    });

    it('produces the same anchor for the same sdBlockId across calls', () => {
      const first = buildTocEntryParagraphs([BASE_SOURCE], makeConfig({ hyperlinks: true }));
      const second = buildTocEntryParagraphs([BASE_SOURCE], makeConfig({ hyperlinks: true }));

      const getAnchor = (paragraphs: typeof first) => {
        const node = paragraphs[0]!.content[0] as { marks?: Array<{ attrs: Record<string, unknown> }> };
        return node.marks?.[0]?.attrs.anchor;
      };

      expect(getAnchor(first)).toBe(getAnchor(second));
    });

    it('does not add link mark when hyperlinks display option is false', () => {
      const paragraphs = buildTocEntryParagraphs([BASE_SOURCE], makeConfig({ hyperlinks: false }));
      const textNode = paragraphs[0]!.content[0] as { marks?: unknown[] };
      expect(textNode.marks).toBeUndefined();
    });
  });

  describe('rightAlignPageNumbers', () => {
    it('adds a right-aligned tab stop when rightAlignPageNumbers is true', () => {
      const paragraphs = buildTocEntryParagraphs([BASE_SOURCE], makeConfig({ rightAlignPageNumbers: true }));
      const tabStops = paragraphs[0]!.attrs.paragraphProperties as Record<string, unknown>;
      expect(tabStops.tabStops).toEqual([{ tab: { tabType: 'right', pos: 9350 } }]);
    });

    it('adds a right-aligned tab stop by default (undefined)', () => {
      const paragraphs = buildTocEntryParagraphs([BASE_SOURCE], makeConfig());
      const tabStops = paragraphs[0]!.attrs.paragraphProperties as Record<string, unknown>;
      expect(tabStops.tabStops).toEqual([{ tab: { tabType: 'right', pos: 9350 } }]);
    });

    it('omits tab stop when rightAlignPageNumbers is false', () => {
      const paragraphs = buildTocEntryParagraphs([BASE_SOURCE], makeConfig({ rightAlignPageNumbers: false }));
      const props = paragraphs[0]!.attrs.paragraphProperties as Record<string, unknown>;
      expect(props.tabStops).toBeUndefined();
    });

    it('includes dot leader when tabLeader is dot', () => {
      const paragraphs = buildTocEntryParagraphs(
        [BASE_SOURCE],
        makeConfig({ rightAlignPageNumbers: true, tabLeader: 'dot' }),
      );
      const props = paragraphs[0]!.attrs.paragraphProperties as Record<string, unknown>;
      expect(props.tabStops).toEqual([{ tab: { tabType: 'right', pos: 9350, leader: 'dot' } }]);
    });

    it('omits leader when tabLeader is none', () => {
      const paragraphs = buildTocEntryParagraphs(
        [BASE_SOURCE],
        makeConfig({ rightAlignPageNumbers: true, tabLeader: 'none' }),
      );
      const props = paragraphs[0]!.attrs.paragraphProperties as Record<string, unknown>;
      expect(props.tabStops).toEqual([{ tab: { tabType: 'right', pos: 9350 } }]);
    });

    it('does not add tab stop when page numbers are omitted', () => {
      const paragraphs = buildTocEntryParagraphs(
        [BASE_SOURCE],
        makeConfig({ rightAlignPageNumbers: true, omitPageNumberLevels: { from: 1, to: 9 } }),
      );
      const props = paragraphs[0]!.attrs.paragraphProperties as Record<string, unknown>;
      expect(props.tabStops).toBeUndefined();
    });
  });
});

describe('collectTocSources', () => {
  it('collects applied outline levels when no explicit \\o range is set', () => {
    const doc = createDocNode([
      createParagraphNode('p-applied', 'Abbreviations', {
        outlineLevel: 1,
        styleId: 'CustomHeading',
      }),
    ]);

    const sources = collectTocSources(doc, {
      source: { useAppliedOutlineLevel: true },
      display: {},
      preserved: {},
    });

    expect(sources).toEqual([
      {
        text: 'Abbreviations',
        level: 2,
        sdBlockId: 'p-applied',
        kind: 'appliedOutline',
      },
    ]);
  });

  it('still respects an explicit outline range for applied outline levels', () => {
    const doc = createDocNode([
      createParagraphNode('p-applied', 'Appendix', {
        outlineLevel: 4,
        styleId: 'CustomHeading',
      }),
    ]);

    const sources = collectTocSources(doc, {
      source: {
        useAppliedOutlineLevel: true,
        outlineLevels: { from: 1, to: 3 },
      },
      display: {},
      preserved: {},
    });

    expect(sources).toEqual([]);
  });
});
