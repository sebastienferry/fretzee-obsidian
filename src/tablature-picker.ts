import { documentWindow } from './dom';
import { Modal, Notice, type App } from 'obsidian';
import { type model } from '@coderline/alphatab';
import { excerptBlock, isGuitarProFile, loadVaultScore, validateSelection, type ExcerptConfiguration } from './tablature';

/** Native picker for a vault Guitar Pro file, track, and inclusive measure range. */
export class TablaturePicker extends Modal {
  private revision = 0;
  private score?: model.Score;

  constructor(app: App, private readonly insert: (block: string) => void) { super(app); }

  /** Build accessible form controls and load tracks only after a file is selected. */
  onOpen(): void {
    const container = this.contentEl;
    container.classList.add('fretzee-picker');
    const doc = container.ownerDocument;
    const heading = documentWindow(doc).createEl('h2');
    heading.textContent = 'Insert Guitar Pro excerpt';
    const form = documentWindow(doc).createEl('form');
    const field = <T extends HTMLElement>(label: string, control: T): T => {
      const wrapper = documentWindow(doc).createEl('label');
      wrapper.textContent = label;
      wrapper.appendChild(control);
      form.appendChild(wrapper);
      return control;
    };
    const option = (select: HTMLSelectElement, text: string, value: string) => {
      const item = documentWindow(doc).createEl('option'); item.textContent = text; item.value = value; select.appendChild(item);
    };
    const file = field('Guitar Pro file', documentWindow(doc).createEl('select'));
    option(file, 'Choose a file from this vault', '');
    const files = this.app.vault.getFiles().filter(isGuitarProFile).sort((a, b) => a.path.localeCompare(b.path));
    files.forEach(item => option(file, item.path, item.path));
    const track = field('Track', documentWindow(doc).createEl('select'));
    track.disabled = true;
    const first = field('First measure', documentWindow(doc).createEl('input'));
    const last = field('Last measure (inclusive)', documentWindow(doc).createEl('input'));
    for (const input of [first, last]) { input.type = 'number'; input.min = '1'; input.step = '1'; input.required = true; input.value = '1'; }
    const profile = field('Notation', documentWindow(doc).createEl('select'));
    option(profile, 'Tablature', 'tab'); option(profile, 'Score', 'score'); option(profile, 'Score and tablature', 'default');
    const status = documentWindow(doc).createEl('p'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    if (!files.length) status.textContent = 'No Guitar Pro files were found in this vault.';
    const actions = documentWindow(doc).createDiv(); actions.className = 'fretzee-picker-actions';
    const cancel = documentWindow(doc).createEl('button'); cancel.type = 'button'; cancel.textContent = 'Cancel'; cancel.onclick = () => this.close();
    const submit = documentWindow(doc).createEl('button'); submit.type = 'submit'; submit.textContent = 'Insert excerpt'; submit.className = 'mod-cta'; submit.disabled = true;
    actions.append(cancel, submit); form.append(status, actions); container.replaceChildren(heading, form);

    file.onchange = async () => {
      const revision = ++this.revision;
      this.score = undefined; track.replaceChildren(); track.disabled = true; submit.disabled = true;
      if (!file.value) { status.textContent = 'Choose a Guitar Pro file.'; return; }
      status.textContent = 'Reading Guitar Pro tracks…';
      try {
        const score = await loadVaultScore(this.app, file.value);
        if (revision !== this.revision) return;
        this.score = score;
        score.tracks.forEach((item, index) => option(track, `${index + 1}. ${item.name || 'Unnamed track'}`, String(index + 1)));
        const stringed = score.tracks.findIndex(item => item.staves.some(staff => !staff.isPercussion && staff.isStringed));
        track.value = String(stringed >= 0 ? stringed + 1 : 1);
        profile.value = stringed >= 0 ? 'tab' : 'score';
        first.value = '1'; last.value = String(Math.min(8, score.masterBars.length));
        first.max = last.max = String(score.masterBars.length);
        track.disabled = false; submit.disabled = false;
        status.textContent = `${score.tracks.length} tracks, ${score.masterBars.length} measures. Select up to 128 measures.`;
      } catch (error) {
        if (revision === this.revision) status.textContent = error instanceof Error ? error.message : 'Unable to read this file.';
      }
    };
    form.onsubmit = event => {
      event.preventDefault();
      if (!this.score) return;
      try {
        const config: ExcerptConfiguration = { file: file.value, track: Number(track.value), bars: `${first.value}-${last.value}`, profile: profile.value as ExcerptConfiguration['profile'] };
        validateSelection(this.score, config);
        this.insert(excerptBlock(config));
        new Notice('Guitar Pro excerpt inserted.');
        this.close();
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : 'Unable to insert this excerpt.';
        new Notice(status.textContent);
      }
    };
  }

  /** Ignore reads that finish after the modal closes. */
  onClose(): void { this.revision++; this.score = undefined; this.contentEl.replaceChildren(); }
}
