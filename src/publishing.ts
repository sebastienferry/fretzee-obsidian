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
import { documentWindow } from './dom';
import { DeviceConnection } from './device-connection';
import {
  prepareUpload,
  sendDraft,
  siteOrigin,
  storedToken,
  type Source,
  type Upload,
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

/** Explicit file-list confirmation; closing it never starts a request. */
class ConfirmSend extends Modal {
  constructor(
    app: App,
    private readonly upload: Upload,
    private readonly submit: () => Promise<void>,
    private readonly closed: () => void,
  ) {
    super(app);
  }
  onOpen(): void {
    this.setTitle('Send a private draft');
    const doc = documentWindow(this.contentEl.ownerDocument);
    const explanation = doc.createEl('p');
    explanation.textContent = `${this.upload.title}: ${this.upload.files.length} files. Review the complete outgoing list. Nothing is published automatically.`;
    const list = doc.createEl('ul');
    for (const file of this.upload.files) {
      const item = doc.createEl('li');
      item.textContent = file.path;
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

/** Display the request verification code while the external browser handles login. */
class ConnectionPrompt extends Modal {
  constructor(app: App, private readonly origin: string, private readonly code: string, private readonly cancelled: () => void) { super(app); }
  onOpen(): void {
    this.setTitle('Connect this device');
    const doc = documentWindow(this.contentEl.ownerDocument);
    const text = doc.createEl('p'); text.textContent = `Approve Obsidian on ${this.origin}. Check that the website shows the same verification code:`;
    const code = doc.createEl('strong'); code.textContent = this.code;
    const cancel = doc.createEl('button'); cancel.type = 'button'; cancel.textContent = 'Cancel connection'; cancel.onclick = () => this.close();
    this.contentEl.replaceChildren(text, code, cancel);
  }
  onClose(): void { this.contentEl.replaceChildren(); this.cancelled(); }
}

/** Optional publication transport owned by the existing offline-rendering plugin. */
export class DocumentPublishing {
  private config?: PublishingConfig;
  private loading?: Promise<PublishingConfig>;
  private disposed = false;
  private preparing = false;
  private confirmation?: ConfirmSend;
  private readonly connection: DeviceConnection;
  private connectionPrompt?: ConnectionPrompt;
  private completingConnection = false;
  constructor(private readonly plugin: Plugin) {
    this.connection = new DeviceConnection(
      async () => (await this.settings()).site,
      (origin, token, isCurrent) => this.storeCredential(origin, token, isCurrent),
      async options => { const response = await requestUrl({ ...options, throw: false }); return { status: response.status, json: response.json as unknown }; },
      () => documentWindow(this.plugin.app.workspace.containerEl.ownerDocument).crypto,
    );
  }

  /** Register UI synchronously without credentials, data writes or network requests. */
  register(): void {
    this.plugin.registerObsidianProtocolHandler('fretzee-connect', params => {
      void this.finishConnection(params).catch((error: unknown) => { if (!this.disposed) new Notice(errorText(error)); });
    });
    this.plugin.addSettingTab(
      new PublishingSettings(this.plugin.app, this.plugin, this),
    );
    this.plugin.addCommand({
      id: 'send-active-note',
      name: 'Send current note as a private draft',
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
          .then((config) => this.open(siteOrigin(config.site) + '/documents'))
          .catch((error: unknown) => {
            new Notice(errorText(error));
          });
      },
    });
    this.plugin.registerEvent(
      this.plugin.app.workspace.on('file-menu', (menu, file) => {
        if (
          file instanceof TFolder ||
          (file instanceof TFile && /^(md|markdown)$/iu.test(file.extension))
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
    this.cancelConnection();
    config.site = value.trim() ? siteOrigin(value.trim()) : '';
    await this.save();
  }
  /** Bind a credential inside SecretStorage, outside synced settings. */
  async saveToken(value: string): Promise<void> {
    await this.storeCredential(siteOrigin((await this.settings()).site), value.trim());
  }
  private async storeCredential(origin: string, token: string, isCurrent: () => boolean = () => true): Promise<void> {
    const config = await this.settings();
    if (this.disposed || !isCurrent() || siteOrigin(config.site) !== origin) throw new Error('Connection cancelled or site changed.');
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
    this.cancelConnection();
    const config = await this.settings();
    this.plugin.app.secretStorage.setSecret(this.secretId(config), '');
    config.tokenOrigin = '';
    await this.save();
  }
  /** Start browser authorization for the configured URL; account passwords stay on the site. */
  async connectDevice(): Promise<void> {
    if (this.disposed) return;
    this.cancelConnection();
    const config = await this.settings();
    const origin = siteOrigin(config.site);
    const request = await this.connection.start(origin, this.plugin.app.vault.getName());
    if (this.disposed || siteOrigin(config.site) !== origin) { this.cancelConnection(); return; }
    this.connectionPrompt = new ConnectionPrompt(this.plugin.app, origin, request.displayCode, () => {
      if (!this.completingConnection) this.connection.cancel();
      this.connectionPrompt = undefined;
    });
    this.connectionPrompt.open(); this.open(request.url);
  }
  /** Validate the callback before storing an upload-only credential. */
  async finishConnection(params: Record<string, string>): Promise<void> {
    const connected = await this.connection.complete(params);
    this.completingConnection = true; this.connectionPrompt?.close(); this.completingConnection = false;
    if (!this.disposed) new Notice(connected ? 'Device connected.' : 'Device connection cancelled.');
  }
  private cancelConnection(): void { this.connection.cancel(); this.connectionPrompt?.close(); this.connectionPrompt = undefined; }
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
          'Connect this device to the site in Fretzee settings.',
        );
      storedToken(
        this.plugin.app.secretStorage.getSecret(this.secretId(config)),
        origin,
      );
      const app = this.plugin.app;
      const source: Source = {
        files: () => app.vault.getFiles(),
        attachments: (note) => {
          const file = app.vault.getFileByPath(normalizePath(note.path));
          if (!file) return [];
          const cache = app.metadataCache.getFileCache(file);
          return [...(cache?.links || []), ...(cache?.embeds || [])]
            .map((link) =>
              app.metadataCache.getFirstLinkpathDest(
                link.link.split('#')[0] || '',
                normalizePath(note.path),
              ),
            )
            .filter((file): file is TFile => file instanceof TFile);
        },
        read: (file) => {
          const entry = app.vault.getFileByPath(normalizePath(file.path));
          if (!entry) throw new Error(`File unavailable: ${file.path}`);
          return app.vault.readBinary(entry);
        },
      };
      const upload = await prepareUpload(
        source,
        {
          path: selected.path,
          title:
            selected instanceof TFile
              ? selected.basename
              : selected.name || app.vault.getName(),
          folder: selected instanceof TFolder,
        },
        config.vaultId,
      );
      if (this.disposed) {
        this.preparing = false;
        return;
      }
      this.confirmation = new ConfirmSend(
        app,
        upload,
        async () => {
          if (
            this.disposed ||
            config.tokenOrigin !== origin ||
            siteOrigin(config.site) !== origin
          )
            throw new Error(
              'The destination changed. Prepare the draft again.',
            );
          const token = storedToken(
            app.secretStorage.getSecret(this.secretId(config)),
            origin,
          );
          const result = await sendDraft(
            origin,
            token,
            upload,
            async (options) => {
              const response = await requestUrl({ ...options, throw: false });
              return {
                status: response.status,
                json: response.json as unknown,
              };
            },
          );
          if (!this.disposed) {
            new Notice(
              'Private draft sent. Review and publish it on the site.',
            );
            this.open(origin + result.reviewPath);
          }
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
    this.cancelConnection();
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
      kind: 'connect',
      name: 'Connect this device',
      desc: 'Sign in on the configured site and approve Obsidian in your browser. No token to copy; access is saved in SecretStorage and can only send private drafts.',
    },
    {
      kind: 'forget',
      name: 'Disconnect this vault',
      desc: 'Remove the local credential. Revoke this device on the site to invalidate its access as well.',
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
    kind: 'site' | 'connect' | 'forget',
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
    } else if (kind === 'connect') {
      setting.addButton(button => button.setButtonText('Connect this device').onClick(() => {
        void this.publishing.connectDevice().catch((error: unknown) => { new Notice(errorText(error)); });
      }));
    } else {
      setting.addButton((button) =>
        button.setButtonText('Disconnect locally').onClick(() => {
          void this.publishing
            .forgetToken()
            .then(() => {
              new Notice('This vault is disconnected.');
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
