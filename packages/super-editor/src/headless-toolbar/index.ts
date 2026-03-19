import { generateLinkedStyleString, getQuickFormatList } from '../extensions/linked-styles/helpers.js';
import { getFileOpener, processAndInsertImageFile } from '../extensions/image/imageHelpers/index.js';

export { createHeadlessToolbar } from './create-headless-toolbar.js';
export { headlessToolbarConstants } from './constants.js';

export const headlessToolbarHelpers = {
  // linked-style helpers
  getQuickFormatList,
  generateLinkedStyleString,
  // image helpers
  getFileOpener,
  processAndInsertImageFile,
};

export type {
  CreateHeadlessToolbarOptions,
  HeadlessToolbarController,
  HeadlessToolbarSurface,
  HeadlessToolbarSuperdocHost,
  ToolbarCommandState,
  ToolbarContext,
  ToolbarSnapshot,
} from './types.js';
