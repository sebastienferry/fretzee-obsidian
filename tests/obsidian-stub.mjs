export class Plugin {
  constructor() {
    const provided = globalThis.fretzeeTestApp || {};
    this.app = { ...provided, workspace: { containerEl: globalThis.document?.body, on: () => ({}), getActiveFile: () => null, ...provided.workspace } };
  }
  settingTabs = [];
  events = [];
  addSettingTab(tab) { this.settingTabs.push(tab); }
  registerEvent(event) { this.events.push(event); }
  async loadData() { return globalThis.fretzeePluginData ?? null; }
  async saveData(data) { globalThis.fretzeePluginData = data; (globalThis.fretzeeDataWrites ??= []).push(data); }
  protocols = new Map();
  registerObsidianProtocolHandler(action, handler) { this.protocols.set(action, handler); }
  processors = new Map();
  commands = [];
  registerMarkdownCodeBlockProcessor(language, handler) { this.processors.set(language, handler); }
  addCommand(command) { this.commands.push(command); }
}

export class Notice {
  constructor(message) { (globalThis.fretzeeNotices ??= []).push(message); }
}

export class TFile {
  __vaultFile = true;
  constructor(path, size = 0) {
    this.path = path; this.name = path.split('/').pop(); this.extension = path.split('.').pop(); this.basename = this.name.replace(/\.[^.]+$/, ''); this.stat = { size };
  }
  static [Symbol.hasInstance](value) { return value?.__vaultFile === true; }
}

export class TFolder {
  __vaultFolder = true;
  constructor(path) { this.path = path; this.name = path.split('/').pop(); }
  static [Symbol.hasInstance](value) { return value?.__vaultFolder === true; }
}

export class PluginSettingTab {
  constructor(app, plugin) { this.app = app; this.plugin = plugin; }
  get containerEl() { return this.container ||= document.createElement('div'); }
}

export class Setting {
  constructor(container) {
    const doc = container.ownerDocument;
    this.settingEl = doc.createElement('div'); this.settingEl.className = 'setting-item';
    this.nameEl = doc.createElement('label'); this.descEl = doc.createElement('p'); this.controlEl = doc.createElement('div');
    this.settingEl.append(this.nameEl,this.descEl,this.controlEl); container.appendChild(this.settingEl);
  }
  setName(value) { this.nameEl.textContent = value; return this; }
  setDesc(value) { this.descEl.textContent = value; return this; }
  setHeading() { return this; }
  addText(callback) {
    const inputEl = this.settingEl.ownerDocument.createElement('input'); this.controlEl.appendChild(inputEl);
    const text = { inputEl, setValue(value) { inputEl.value = value; return text; }, setPlaceholder(value) { inputEl.placeholder = value; return text; }, onChange(handler) { inputEl.oninput = () => handler(inputEl.value); return text; } };
    callback(text); return this;
  }
  addButton(callback) {
    const buttonEl = this.settingEl.ownerDocument.createElement('button'); this.controlEl.appendChild(buttonEl);
    const button = { buttonEl, setButtonText(value) { buttonEl.textContent = value; return button; }, onClick(handler) { buttonEl.onclick = handler; return button; } };
    callback(button); return this;
  }
}

export async function requestUrl(options) {
  (globalThis.fretzeeRequests ??= []).push(options);
  if (!globalThis.fretzeeRequestUrl) throw new Error('Unexpected network request');
  return globalThis.fretzeeRequestUrl(options);
}

export class MarkdownRenderChild {
  events = [];
  constructor(container) { this.containerEl = container; }
  registerEvent(event) { this.events.push(event); }
  load() { this.onload(); }
  unload() { this.onunload(); this.events.forEach(event => event.off()); }
}

export class Modal {
  constructor(app) { this.app = app; this.contentEl = document.createElement('div'); }
  setTitle(title) { this.title = title; return this; }
  open() { document.body.appendChild(this.contentEl); this.onOpen(); }
  close() { this.onClose(); this.contentEl.remove(); }
}

/** Test host implementation of the documented public Obsidian path cleanup. */
export function normalizePath(path) {
  return path.replace(/[\u00a0\u202f]/g, ' ').replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '').normalize('NFC');
}

/** Install the host's cross-window DOM helpers into a fresh jsdom window. */
export function installHostDom(dom) {
  const { window } = dom;
  Object.defineProperty(window.document, 'win', { value: window });
  window.createEl = tag => window.document.createElement(tag);
  window.createDiv = () => window.document.createElement('div');
  window.createSpan = () => window.document.createElement('span');
  window.createFragment = () => window.document.createDocumentFragment();
}
