/** Resolve Obsidian's DOM helpers in the element's own window, including popouts. */
export function documentWindow(doc: Document): typeof window {
  return doc.win as typeof window;
}
