import { documentWindow } from './dom';
import { parseConfiguration, readConfiguration, isSheetConfiguration } from './configuration';
import { renderSheet } from './sheet';
import { createDiagramImage, renderDiagramConfiguration, type DiagramImage } from './svg';

export { parseConfiguration } from './configuration';

/** Render a single diagram with the bundled core without changing its drawing. */
export function renderDiagram(source: string): DiagramImage {
  return renderDiagramConfiguration(parseConfiguration(source));
}

/** Render either a diagram or an exported sheet, keeping errors local and textual. */
export function renderCodeBlock(source: string, container: HTMLElement): void {
  container.replaceChildren();
  container.classList.add('fretzee-block');
  container.classList.remove('fretzee-block-error', 'fretzee-sheet-block');
  const doc = container.ownerDocument;
  try {
    const configuration = readConfiguration(source);
    if (isSheetConfiguration(configuration)) {
      const sheet = renderSheet(configuration, doc);
      container.classList.add('fretzee-sheet-block');
      container.appendChild(sheet);
    } else {
      container.appendChild(createDiagramImage(renderDiagram(source), doc));
    }
  } catch (error) {
    container.classList.add('fretzee-block-error');
    const message = documentWindow(doc).createEl('p');
    message.setAttribute('role', 'alert');
    message.textContent = `Fretzee: ${error instanceof Error ? error.message : 'Unable to render this configuration.'}`;
    container.appendChild(message);
  }
}
