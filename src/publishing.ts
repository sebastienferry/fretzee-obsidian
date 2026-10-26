import {
  Modal,
  Notice,
  PluginSettingTab,
  Setting,
  TFile,
  TFolder,
  normalizePath,
  requestUrl,
  type App,
  type Plugin,
  type TAbstractFile,
  type SettingDefinitionItem,
} from 'obsidian';
import { resolveMainNote } from './root-note';
import { documentWindow } from './dom';
import { noteMetadata, prepareNote, type NoteSource, type PreparedNote } from './note-bundle';
import {
  LIMITS,
  sendDraft,
  siteOrigin,
  storedToken,
} from './publishing-protocol';

interface PublishingConfig {
  site: string;
  vaultId: string;
  tokenOrigin: string;
}
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : 'The document operation failed.';

/** Choose a main note without changing vault metadata before final send confirmation. */
class ChooseMainNote extends Modal {
  constructor(app: App, private readonly candidates: { path: string; name: string }[], private readonly preferred: string, private readonly choose: (path: string | null) => void) { super(app); }
  onOpen(): void {
    this.setTitle('Define the Fretzee main note');
    const doc = documentWindow(this.contentEl.ownerDocument);
    const description = doc.createEl('p');
    description.textContent = 'No main note is defined for this directory. Choose its editorial note. Other files, including lyrics, will be attached resources. The final send confirmation saves its document type and stable identity.';
    const label = doc.createEl('label'); label.textContent = 'Main note';
    const select = doc.createEl('select');
    for (const file of this.candidates) { const option = doc.createEl('option'); option.value = file.path; option.textContent = file.name; select.appendChild(option); }
    select.value = this.preferred; label.appendChild(select);
    const actions = doc.createDiv(); actions.className = 'fretzee-picker-actions';
    const cancel = doc.createEl('button'); cancel.textContent = 'Cancel'; cancel.onclick = () => this.close();
    const review = doc.createEl('button'); review.textContent = 'Use as main note and review'; review.className = 'mod-cta';
    review.onclick = () => { this.choose(select.value); this.close(); };
    actions.append(cancel, review); this.contentEl.replaceChildren(description, label, actions);
  }
  onClose(): void { this.contentEl.replaceChildren(); this.choose(null); }
}

/** Explicit file-list confirmation; closing it never starts a request. */
class ConfirmSend extends Modal {
  constructor(
    app: App,
    private readonly notes: PreparedNote[],
    private readonly submit: () => Promise<void>,
    private readonly closed: () => void,
  ) {
    super(app);
  }
  onOpen(): void {
    this.setTitle('Send a private draft');
    const doc = documentWindow(this.contentEl.ownerDocument);
    const explanation = doc.createEl('p');
    explanation.textContent = `${this.notes.length} document container, ${this.notes.reduce((count, note) => count + note.upload.files.length, 0)} files. The main note is the editorial document; all other files are resources. Confirming saves flat fretzee-type: document and fretzee-id properties. Nothing is published automatically.`;
    const list = doc.createEl('ul');
    for (const note of this.notes) {
      const item = doc.createEl('li');
      item.textContent = note.file.path + (note.dependencies.length ? ' — ' + note.dependencies.map(file => file.source).join(', ') : '');
      list.appendChild(item);
    }
    const actions = doc.createDiv();
    actions.className = 'fretzee-picker-actions';
    const cancel = doc.createEl('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    cancel.onclick = () => this.close();
    const send = doc.createEl('button');
    send.type = 'button';
    send.textContent = 'Send private draft';
    send.className = 'mod-cta';
    send.onclick = () => {
      send.disabled = true;
      cancel.disabled = true;
      void this.submit()
        .then(() => this.close())
        .catch((error: unknown) => {
          new Notice(errorText(error));
          send.disabled = false;
          cancel.disabled = false;
        });
    };
    actions.append(cancel, send);
    this.contentEl.replaceChildren(explanation, list, actions);
  }
  onClose(): void {
    this.contentEl.replaceChildren();
    this.closed();
  }
}

/** Optional publication transport owned by the existing offline-rendering plugin. */
export class DocumentPublishing {
  private config?: PublishingConfig;
  private loading?: Promise<PublishingConfig>;
  private disposed = false;
  private preparing = false;
  private confirmation?: ConfirmSend;
  private rootPrompt?: ChooseMainNote;
  constructor(private readonly plugin: Plugin) {}

  /** Register UI synchronously without credentials, data writes or network requests. */
  register(): void {
    this.plugin.addSettingTab(
      new PublishingSettings(this.plugin.app, this.plugin, this),
    );
    this.plugin.addCommand({
      id: 'send-active-note',
      name: 'Send current note’s document as a private draft',
      checkCallback: (checking) => {
        const file = this.plugin.app.workspace.getActiveFile();
        if (!file || !/^(md|markdown)$/iu.test(file.extension)) return false;
        if (!checking) void this.prepare(file);
        return true;
      },
    });
    this.plugin.addCommand({
      id: 'open-documents',
      name: 'Open documents',
      callback: () => {
        void this.settings()
          .then((config) => this.open(siteOrigin(config.site) + '/collection?type=documents'))
          .catch((error: unknown) => {
            new Notice(errorText(error));
          });
      },
    });
    this.plugin.registerEvent(
      this.plugin.app.workspace.on('file-menu', (menu, file) => {
        if (
          file instanceof TFolder ||
          file instanceof TFile
        ) {
          menu.addItem((item) =>
            item
              .setTitle('Send to Fretzee as a private draft')
              .setIcon('upload')
              .onClick(() => {
                void this.prepare(file);
              }),
          );
        }
      }),
    );
  }

  /** Load configuration only after a publishing action; rendering needs none. */
  settings(): Promise<PublishingConfig> {
    this.loading ??= this.plugin
      .loadData()
      .then((data: unknown) => {
        const value = record(record(data).publishing);
        this.config = {
          site: typeof value.site === 'string' ? value.site : '',
          vaultId:
            typeof value.vaultId === 'string' && value.vaultId
              ? value.vaultId
              : documentWindow(
                  this.plugin.app.workspace.containerEl.ownerDocument,
                ).crypto.randomUUID(),
          tokenOrigin:
            typeof value.tokenOrigin === 'string' ? value.tokenOrigin : '',
        };
        return this.config;
      })
      .catch((error: unknown) => {
        this.loading = undefined;
        throw error;
      });
    return this.loading;
  }
  /** Merge only the publishing namespace into the latest plugin data. */
  private async save(): Promise<void> {
    const data = record((await this.plugin.loadData()) as unknown);
    await this.plugin.saveData({
      ...data,
      publishing: { ...record(data.publishing), ...this.config },
    });
  }
  private secretId(config: PublishingConfig): string {
    return `fretzee-publish-${config.vaultId}`;
  }
  /** Save a site origin without moving or exposing existing credentials. */
  async saveSite(value: string): Promise<void> {
    const config = await this.settings();
    config.site = value.trim() ? siteOrigin(value.trim()) : '';
    await this.save();
  }
  /** Bind a credential inside SecretStorage, outside synced settings. */
  async saveToken(value: string): Promise<void> {
    const config = await this.settings();
    const origin = siteOrigin(config.site);
    const token = value.trim();
    if (!/^fup_[a-f0-9]{32}$/u.test(token))
      throw new Error('Enter a valid upload token.');
    this.plugin.app.secretStorage.setSecret(
      this.secretId(config),
      JSON.stringify({ origin, token }),
    );
    config.tokenOrigin = origin;
    await this.save();
  }
  /** Forgetting a local credential does not revoke its server-side counterpart. */
  async forgetToken(): Promise<void> {
    const config = await this.settings();
    this.plugin.app.secretStorage.setSecret(this.secretId(config), '');
    config.tokenOrigin = '';
    await this.save();
  }
  private open(url: string): void {
    if (!this.disposed)
      documentWindow(this.plugin.app.workspace.containerEl.ownerDocument).open(
        url,
        '_blank',
        'noopener',
      );
  }

  /** Prepare visible vault files, then wait for explicit outgoing-scope confirmation. */
  async prepare(selected: TAbstractFile): Promise<void> {
    if (this.disposed) return;
    if (this.preparing) {
      new Notice('A draft is already being prepared or confirmed.');
      return;
    }
    this.preparing = true;
    try {
      const config = await this.settings();
      const origin = siteOrigin(config.site);
      if (config.tokenOrigin !== origin)
        throw new Error(
          'Save an upload token for this site in publishing settings.',
        );
      storedToken(
        this.plugin.app.secretStorage.getSecret(this.secretId(config)),
        origin,
      );
      const app = this.plugin.app;
      const source: NoteSource = {
        files: () => app.vault.getFiles(),
        text: (file) => {
          const entry = app.vault.getFileByPath(normalizePath(file.path));
          if (!entry) throw new Error(`Note unavailable: ${file.path}`);
          return app.vault.read(entry);
        },
        read: (file) => {
          const entry = app.vault.getFileByPath(normalizePath(file.path));
          if (!entry) throw new Error(`File unavailable: ${file.path}`);
          return app.vault.readBinary(entry);
        },
        resolve: (reference, note) => app.metadataCache.getFirstLinkpathDest(reference, normalizePath(note.path)),
        cachedId: (file) => {
          const entry = app.vault.getFileByPath(normalizePath(file.path));
          const metadata: unknown = entry ? app.metadataCache.getFileCache(entry)?.frontmatter : undefined;
          return record(metadata)['fretzee-id'] ?? record(record(metadata).fretzee).id;
        },
      };
      const selection = await resolveMainNote(source, selected.path, selected instanceof TFolder);
      let main = selection.main;
      if (!main) {
        const selectedPath = await new Promise<string | null>(resolve => {
          this.rootPrompt = new ChooseMainNote(app, selection.candidates, selection.preferred || '', resolve);
          this.rootPrompt.open();
        });
        this.rootPrompt = undefined;
        if (!selectedPath || this.disposed) { this.preparing = false; return; }
        main = selection.candidates.find(file => file.path === selectedPath);
      }
      if (!main) throw new Error('Choose a valid editorial Markdown note.');
      const chosen = [main];
      const ids = new Map<string, string[]>();
      for (const file of source.files()) {
        const identity = source.cachedId(file);
        if (typeof identity !== 'string') continue;
        ids.set(identity, [...(ids.get(identity) || []), normalizePath(file.path)]);
      }
      const notes: PreparedNote[] = [];
      const chosenIds = new Set<string>();
      let batchBytes = 0;
      for (const file of chosen) {
        const metadata = noteMetadata(await source.text(file));
        const id = metadata.id || documentWindow(app.workspace.containerEl.ownerDocument).crypto.randomUUID();
        const copies = (ids.get(id) || []).filter(path => path !== normalizePath(file.path));
        if (copies.length || chosenIds.has(id)) throw new Error(`Duplicate fretzee.id in ${file.path}. Remove the ID from the copied note before sending.`);
        chosenIds.add(id);
        const prepared = await prepareNote(source, file, id, true);
        batchBytes += prepared.upload.files.reduce((size, entry) => size + Math.floor(entry.content.length * 3 / 4) - (entry.content.endsWith('==') ? 2 : entry.content.endsWith('=') ? 1 : 0), 0);
        if (batchBytes > LIMITS.totalBytes) throw new Error('Select a smaller batch: notes and dependencies exceed 20 MiB.');
        notes.push(prepared);
      }
      if (this.disposed) {
        this.preparing = false;
        return;
      }
      this.confirmation = new ConfirmSend(
        app,
        notes,
        async () => {
          if (
            this.disposed ||
            config.tokenOrigin !== origin ||
            siteOrigin(config.site) !== origin
          )
            throw new Error(
              'The destination changed. Prepare the draft again.',
            );
          // Rebuild before the first metadata write so changed outgoing scope needs review.
          for (const note of notes) {
            const fresh = await prepareNote(source, note.file, note.id, true);
            if (fresh.originalHash !== note.originalHash || fresh.fingerprint !== note.fingerprint) throw new Error('The note or an attachment changed. Cancel and prepare the send again.');
          }
          let sent = 0;
          let reviewPath = '/collection?type=documents';
          try {
            for (const note of notes) {
              if (this.disposed || config.tokenOrigin !== origin || siteOrigin(config.site) !== origin) throw new Error('The destination changed. Prepare the draft again.');
              const entry = app.vault.getFileByPath(normalizePath(note.file.path));
              if (!entry) throw new Error(`Note unavailable: ${note.file.path}`);
              const currentMetadata = noteMetadata(await source.text(note.file));
              if (currentMetadata.metadata['fretzee-id'] !== note.id || currentMetadata.metadata['fretzee-type'] !== 'document') {
                await app.fileManager.processFrontMatter(entry, (frontmatter: unknown) => {
                  const values = record(frontmatter);
                  const current = record(values.fretzee);
                  const identity = values['fretzee-id'] ?? current.id;
                  if (identity !== undefined && identity !== note.id) throw new Error('The note identity changed. Prepare the send again.');
                  values['fretzee-type'] = 'document'; values['fretzee-id'] = note.id;
                  const legacy = { ...current }; delete legacy.id;
                  if (Object.keys(legacy).length) values.fretzee = legacy;
                  else delete values.fretzee;
                });
              }
              const fresh = await prepareNote(source, note.file, note.id, true);
              if (fresh.fingerprint !== note.fingerprint) throw new Error('The reviewed content changed. Prepare the send again.');
              note.originalHash = fresh.originalHash;
              const token = storedToken(app.secretStorage.getSecret(this.secretId(config)), origin);
              const result = await sendDraft(origin, token, fresh.upload, async (options) => {
                for (let attempt = 0; ; attempt++) {
                  if (this.disposed || config.tokenOrigin !== origin || siteOrigin(config.site) !== origin) throw new Error('Sending stopped because the plugin or destination changed.');
                  const response = await requestUrl({ ...options, throw: false });
                  if (response.status !== 429 || attempt >= 6) return { status: response.status, json: response.json as unknown };
                  new Notice('Waiting for the upload rate limit. Completed notes are already saved.');
                  await new Promise(resolve => documentWindow(app.workspace.containerEl.ownerDocument).setTimeout(resolve, 5000));
                }
              });
              const data = record(await this.plugin.loadData());
              const publishing = record(data.publishing);
              const state = record(publishing.sendState);
              await this.plugin.saveData({ ...data, publishing: { ...publishing, sendState: { ...state, [origin]: { ...record(state[origin]), [note.id]: { documentId: result.id, fingerprint: fresh.fingerprint, sentAt: Date.now() } } } } });
              sent++;
              reviewPath = result.reviewPath;
              new Notice(`Sent ${sent}/${notes.length} document containers as private drafts.`);
            }
          } catch (error) {
            new Notice(`${sent}/${notes.length} document containers sent. Successful sends are preserved; retrying unchanged notes does not create new revisions.`);
            throw error;
          }
          if (!this.disposed) this.open(origin + (notes.length === 1 ? reviewPath : '/collection?type=documents'));
        },
        () => {
          this.confirmation = undefined;
          this.preparing = false;
        },
      );
      this.confirmation.open();
    } catch (error) {
      this.preparing = false;
      if (!this.disposed) new Notice(errorText(error));
    }
  }
  /** Invalidate pending preparation and close confirmations when disabled. */
  dispose(): void {
    this.disposed = true;
    this.rootPrompt?.close();
    this.rootPrompt = undefined;
    this.confirmation?.close();
    this.confirmation = undefined;
  }
}

/** Publishing remains optional in the existing plugin's settings tab. */
class PublishingSettings extends PluginSettingTab {
  private readonly rows = [
    {
      kind: 'site',
      name: 'Site address',
      desc: 'Offline rendering needs no account. Configure an HTTPS origin, or loopback HTTP for local development.',
    },
    {
      kind: 'token',
      name: 'Upload token',
      desc: 'Create a token in the site document library. Stored only in Obsidian SecretStorage; tokens send private drafts but cannot publish.',
    },
    {
      kind: 'forget',
      name: 'Forget upload token',
      desc: 'Revoke it on the site as well if it should stop working.',
    },
  ] as const;
  constructor(
    app: App,
    plugin: Plugin,
    private readonly publishing: DocumentPublishing,
  ) {
    super(app, plugin);
  }
  /** Searchable settings on Obsidian 1.13 and later. */
  getSettingDefinitions(): SettingDefinitionItem[] {
    return this.rows.map((row) => ({
      name: row.name,
      desc: row.desc,
      render: (setting) => this.renderRow(setting, row.kind),
    }));
  }
  private renderRow(
    setting: Setting,
    kind: 'site' | 'token' | 'forget',
  ): () => void {
    let active = true;
    if (kind === 'site') {
      void this.publishing
        .settings()
        .then((config) => {
          if (!active) return;
          let site = config.site;
          setting
            .addText((text) =>
              text
                .setValue(site)
                .setPlaceholder('https://dev.fretzee.com')
                .onChange((value) => {
                  site = value;
                }),
            )
            .addButton((button) =>
              button.setButtonText('Save site').onClick(() => {
                void this.publishing
                  .saveSite(site)
                  .then(() => {
                    new Notice('Site saved.');
                  })
                  .catch((error: unknown) => {
                    new Notice(errorText(error));
                  });
              }),
            );
        })
        .catch((error: unknown) => {
          if (active) new Notice(errorText(error));
        });
    } else if (kind === 'token') {
      let credential = '';
      let input: HTMLInputElement;
      setting
        .addText((text) => {
          input = text.inputEl;
          input.type = 'password';
          input.autocomplete = 'off';
          text.onChange((value) => {
            credential = value;
          });
        })
        .addButton((button) =>
          button.setButtonText('Save token').onClick(() => {
            void this.publishing
              .saveToken(credential)
              .then(() => {
                credential = '';
                if (active) input.value = '';
                new Notice('Upload token saved.');
              })
              .catch((error: unknown) => {
                new Notice(errorText(error));
              });
          }),
        );
    } else {
      setting.addButton((button) =>
        button.setButtonText('Forget token').onClick(() => {
          void this.publishing
            .forgetToken()
            .then(() => {
              new Notice('Upload token forgotten on this device.');
            })
            .catch((error: unknown) => {
              new Notice(errorText(error));
            });
        }),
      );
    }
    return () => {
      active = false;
    };
  }
}
