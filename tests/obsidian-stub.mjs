export class Plugin {
  app = globalThis.fretzeeTestApp;
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
    this.path = path; this.extension = path.split('.').pop(); this.stat = { size };
  }
  static [Symbol.hasInstance](value) { return value?.__vaultFile === true; }
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
