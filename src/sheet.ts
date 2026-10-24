import { documentWindow } from './dom';
import type { FretboardOptions } from 'fretzee';
import { isObject, isSheetConfiguration } from './configuration';
import { createDiagramImage, renderDiagramConfiguration } from './svg';

interface SheetItem { config: FretboardOptions; colSpan: number }
interface Sheet {
  title: string; subtitle: string; showTitle: boolean; showSubtitle: boolean;
  columns: number; gapX: number; gapY: number; padding: number;
  background: string; titleAlign: 'left' | 'center' | 'right'; items: SheetItem[];
}

function text(value: unknown, field: string): string {
  if (value === undefined) return '';
  if (typeof value !== 'string') throw new Error(`${field} must be text.`);
  return value;
}

function flag(value: unknown, fallback: boolean, field: string): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') throw new Error(`${field} must be true or false.`);
  return value;
}

function number(value: unknown, fallback: number, maximum: number, field: string, minimum = 0, integer = false): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum || (integer && !Number.isInteger(value))) {
    throw new Error(`${field} must be ${integer ? 'an integer' : 'a number'} between ${minimum} and ${maximum}.`);
  }
  return value;
}

function orientation(value: unknown, field: string): 'horizontal' | 'vertical' | undefined {
  if (value === undefined || value === null) return undefined;
  if (value !== 'horizontal' && value !== 'vertical') throw new Error(`${field} must be horizontal or vertical.`);
  return value;
}

/** Normalize supported Studio export fields without changing the source object. */
export function parseSheet(document: Record<string, unknown>): Sheet {
  if (document.type === 'fretzee_sheet' && document.version !== undefined && document.version !== '1.0' && document.version !== 1) {
    throw new Error('Unsupported Fretzee sheet export version.');
  }
  const sheet = document.type === 'fretzee_sheet' || 'sheet' in document ? document.sheet : document;
  if (!isObject(sheet)) throw new Error('The sheet property must contain an object.');
  if (!Array.isArray(sheet.items) || !sheet.items.length || sheet.items.length > 64) {
    throw new Error('A sheet must contain between 1 and 64 diagram items.');
  }
  const layout = sheet.layout ?? {};
  const overrides = sheet.overrides ?? {};
  if (!isObject(layout) || !isObject(overrides)) throw new Error('Sheet layout and overrides must be objects.');
  if (layout.mode !== undefined && layout.mode !== 'grid') throw new Error('Only grid sheet layouts are supported.');
  if (overrides.colorScheme !== undefined && overrides.colorScheme !== null && overrides.colorScheme !== '') {
    throw new Error('Sheet palette overrides are not supported. Export with original diagram colors.');
  }
  const columns = number(layout.columns, 4, 8, 'Columns', 1, true);
  const sheetOrientation = orientation(overrides.orientation, 'Sheet orientation');
  const uniformScale = flag(overrides.uniformScale, true, 'Uniform scale');
  const titleAlign = layout.titleAlign ?? 'left';
  if (titleAlign !== 'left' && titleAlign !== 'center' && titleAlign !== 'right') throw new Error('Title alignment must be left, center, or right.');
  const items = sheet.items.map((item: unknown, index: number): SheetItem => {
    if (!isObject(item)) throw new Error(`Sheet item ${index + 1} must be an object.`);
    const raw = item.config ?? item.payload;
    if (item.isSheet || item.type === 'sheet' || item.type === 'fretzee_sheet' || (isObject(raw) && isSheetConfiguration(raw))) {
      throw new Error(`Nested sheets are not supported (item ${index + 1}).`);
    }
    if (!isObject(raw)) throw new Error(`Sheet item ${index + 1} needs a diagram config object.`);
    const showTitle = flag(item.showTitle, flag(raw.showTitle, true, 'Diagram title visibility'), 'Item title visibility');
    const showSubtitle = flag(item.showSubtitle, flag(raw.showSubtitle, true, 'Diagram subtitle visibility'), 'Item subtitle visibility');
    const title = text(item.label, 'Item label') || text(raw.title, 'Diagram title') || text(item.title, 'Item title');
    const config: FretboardOptions = {
      ...raw,
      ...(uniformScale ? { stringSpacing: 30, fretSpacing: 60 } : {}),
      title: showTitle ? title : '',
      subtitle: showSubtitle ? text(raw.subtitle, 'Diagram subtitle') : '',
      orientation: orientation(item.orientation, 'Item orientation') ?? sheetOrientation ?? orientation(raw.orientation, 'Diagram orientation') ?? 'vertical',
    };
    return { config, colSpan: number(item.colSpan, 1, columns, 'Column span', 1, true) };
  });
  return {
    title: text(sheet.title, 'Sheet title'), subtitle: text(sheet.subtitle, 'Sheet subtitle'),
    showTitle: flag(sheet.showTitle, true, 'Sheet title visibility'),
    showSubtitle: flag(sheet.showSubtitle, true, 'Sheet subtitle visibility'),
    columns, gapX: number(layout.gapX, 28, 512, 'Horizontal gap'), gapY: number(layout.gapY, 32, 512, 'Vertical gap'),
    padding: number(layout.padding, 32, 512, 'Padding'), background: text(layout.background ?? 'transparent', 'Background'),
    titleAlign, items,
  };
}

/** Compose isolated, unmodified diagram images in the sheet's declared grid. */
export function renderSheet(configuration: Record<string, unknown>, doc: Document): HTMLElement {
  const sheet = parseSheet(configuration);
  const figure = documentWindow(doc).createEl('figure');
  figure.className = 'fretzee-sheet';
  figure.dataset.columns = String(sheet.columns);
  figure.style.padding = `${sheet.padding}px`;
  // Named backgrounds are explicit export choices, independent of the host theme.
  const background = sheet.background === 'dark' ? '#0a0e17' : sheet.background === 'light' ? '#ffffff' : sheet.background;
  figure.style.backgroundColor = background;
  if (!figure.style.backgroundColor) throw new Error('Sheet background must be a valid CSS color.');
  figure.dataset.background = ['dark', 'light', 'transparent'].includes(sheet.background) ? sheet.background : 'custom';
  const caption = documentWindow(doc).createEl('figcaption');
  caption.style.textAlign = sheet.titleAlign;
  if (sheet.showTitle && sheet.title.trim()) {
    const title = documentWindow(doc).createEl('h3'); title.className = 'fretzee-sheet-title'; title.textContent = sheet.title; caption.appendChild(title);
  }
  if (sheet.showSubtitle && sheet.subtitle.trim()) {
    const subtitle = documentWindow(doc).createEl('p'); subtitle.className = 'fretzee-sheet-subtitle'; subtitle.textContent = sheet.subtitle; caption.appendChild(subtitle);
  }
  if (caption.childElementCount) figure.appendChild(caption);
  const grid = documentWindow(doc).createDiv();
  grid.className = 'fretzee-sheet-grid';
  grid.style.gridTemplateColumns = `repeat(${sheet.columns}, minmax(0, 1fr))`;
  grid.style.columnGap = `${sheet.gapX}px`;
  grid.style.rowGap = `${sheet.gapY}px`;
  sheet.items.forEach((item, index) => {
    const cell = documentWindow(doc).createDiv(); cell.className = 'fretzee-sheet-item'; cell.dataset.itemIndex = String(index);
    cell.style.gridColumn = `span ${item.colSpan}`;
    try { cell.appendChild(createDiagramImage(renderDiagramConfiguration(item.config), doc)); }
    catch (error) { throw new Error(`Sheet item ${index + 1}: ${error instanceof Error ? error.message : 'Unable to render diagram.'}`); }
    grid.appendChild(cell);
  });
  figure.appendChild(grid);
  return figure;
}
