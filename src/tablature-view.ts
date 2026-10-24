import { documentWindow } from './dom';
import { MarkdownRenderChild, normalizePath, type App } from 'obsidian';
import { loadVaultScore, parseExcerptConfiguration, renderExcerpt } from './tablature';

/** Own vault listeners and prevent stale async reads from updating an unloaded block. */
export class TablatureView extends MarkdownRenderChild {
  private revision = 0;
  private stopped = false;

  constructor(container: HTMLElement, private readonly app: App, private readonly source: string) {
    super(container);
  }

  /** Start rendering and refresh only when the referenced vault path changes. */
  onload(): void {
    this.stopped = false;
    const refresh = (path: string) => {
      try {
        if (parseExcerptConfiguration(this.source).file === normalizePath(path)) void this.refresh();
      } catch { /* The initial render already reports invalid configuration. */ }
    };
    this.registerEvent(this.app.vault.on('modify', file => refresh(file.path)));
    this.registerEvent(this.app.vault.on('delete', file => refresh(file.path)));
    this.registerEvent(this.app.vault.on('rename', (file, oldPath) => { refresh(oldPath); refresh(file.path); }));
    void this.refresh();
  }

  /** Invalidate pending reads; the host disposes registered event references. */
  onunload(): void {
    this.stopped = true;
    this.revision++;
  }

  /** Load and display the current excerpt with block-local errors. */
  async refresh(): Promise<void> {
    if (this.stopped) return;
    const revision = ++this.revision;
    const container = this.containerEl;
    const doc = container.ownerDocument;
    container.classList.add('fretzee-tablature');
    container.classList.remove('fretzee-block-error');
    container.textContent = 'Loading tablature…';
    try {
      const config = parseExcerptConfiguration(this.source);
      const score = await loadVaultScore(this.app, config.file);
      if (this.stopped || revision !== this.revision) return;
      const chunks = renderExcerpt(score, config, container.clientWidth);
      const fragment = documentWindow(doc).createFragment();
      if (config.title) {
        const title = documentWindow(doc).createEl('h3');
        title.className = 'fretzee-excerpt-title'; title.textContent = config.title;
        fragment.appendChild(title);
      }
      chunks.forEach((svg, index) => {
        const image = documentWindow(doc).createEl('img');
        image.alt = `${score.tracks[config.track - 1]!.name || 'Track ' + config.track}, measures ${config.bars}, part ${index + 1}`;
        image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        fragment.appendChild(image);
      });
      container.replaceChildren(fragment);
    } catch (error) {
      if (this.stopped || revision !== this.revision) return;
      container.classList.add('fretzee-block-error');
      const message = documentWindow(doc).createEl('p');
      message.setAttribute('role', 'alert');
      message.textContent = `Fretzee: ${error instanceof Error ? error.message : 'Unable to render this tablature.'}`;
      container.replaceChildren(message);
    }
  }
}
