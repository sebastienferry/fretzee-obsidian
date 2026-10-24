import { documentWindow } from './dom';
import { Fretboard, type FretboardOptions } from 'fretzee';

export interface DiagramImage { svg: string; title: string }

/** Serialize the core's drawing unchanged, preserving its existing xmlns declaration. */
export function renderDiagramConfiguration(config: FretboardOptions): DiagramImage {
  const svg = new Fretboard(config).render();
  return {
    svg: svg.outerHTML,
    title: typeof config.title === 'string' && config.title.trim() ? config.title : 'Fretzee diagram',
  };
}

/** Isolate SVG in an image context without injecting cached previews or note HTML. */
export function createDiagramImage(result: DiagramImage, doc: Document): HTMLImageElement {
  const image = documentWindow(doc).createEl('img');
  image.className = 'fretzee-diagram';
  image.alt = result.title;
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.svg)}`;
  return image;
}
