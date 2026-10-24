import { Notice, Plugin } from 'obsidian';
import { renderCodeBlock } from './diagram';
import { renderChords } from './chords';
import { EXAMPLE_BLOCK } from './example';
import { TablatureView } from './tablature-view';
import { TablaturePicker } from './tablature-picker';
import { DocumentPublishing } from './publishing';

/** Offline Fretzee SVG rendering for fenced code blocks in Obsidian notes. */
export default class FretzeePlugin extends Plugin {
  private picker?: TablaturePicker;
  private publishing?: DocumentPublishing;
  /** Register processors and an editor command; Obsidian disposes them on unload. */
  onload(): void {
    for (const language of ['fretzee', 'fretzee_sheet']) {
      this.registerMarkdownCodeBlockProcessor(language, (source, element) => { renderCodeBlock(source, element); });
    }
    this.registerMarkdownCodeBlockProcessor('tablature', (source, element, context) => {
      context.addChild(new TablatureView(element, this.app, source));
    });
    this.registerMarkdownCodeBlockProcessor('chords', renderChords);
    this.addCommand({
      id: 'insert-tablature',
      name: 'Insert Guitar Pro excerpt',
      editorCallback: editor => {
        this.picker?.close();
        this.picker = new TablaturePicker(this.app, block => {
          const prefix = editor.getCursor('from').ch > 0 ? '\n\n' : '';
          editor.replaceSelection(`${prefix}${block}\n`);
        });
        this.picker.open();
      },
    });
    this.publishing = new DocumentPublishing(this);
    this.publishing.register();
    this.addCommand({
      id: 'insert-diagram',
      name: 'Insert example diagram',
      editorCallback: (editor) => {
        try {
          // Start on a new line even when the cursor is in the middle of a paragraph.
          const { ch } = editor.getCursor('from');
          const prefix = ch > 0 ? '\n\n' : '';
          editor.replaceSelection(`${prefix}${EXAMPLE_BLOCK}\n`);
          new Notice('Fretzee diagram inserted.');
        } catch {
          new Notice('Unable to insert the Fretzee diagram.');
        }
      },
    });
  }

  /** Close picker and pending publishing confirmation when disabled. */
  onunload(): void { this.picker?.close(); this.publishing?.dispose(); }
}
