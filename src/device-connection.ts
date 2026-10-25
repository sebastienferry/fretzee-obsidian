import { siteOrigin, type Transport } from './publishing-protocol';

interface PendingConnection { origin: string; state: string; verifier: string; expires: number; revision: number }
const base64url = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

/** Bind a browser approval to one pending native client, origin and PKCE verifier. */
export class DeviceConnection {
  private pending?: PendingConnection;
  private revision = 0;
  constructor(
    private readonly currentOrigin: () => Promise<string>,
    private readonly persist: (origin: string, token: string, isCurrent: () => boolean) => Promise<void>,
    private readonly transport: Transport,
    private readonly crypto: () => Crypto,
  ) {}

  /** Prepare an external browser request without sending credentials or vault files. */
  async start(origin: string, vault: string): Promise<{ url: string; displayCode: string }> {
    this.cancel();
    const revision = this.revision;
    const site = siteOrigin(origin);
    const crypto = this.crypto();
    const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
    const state = base64url(crypto.getRandomValues(new Uint8Array(24)));
    const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
    if (revision !== this.revision) throw new Error('Device connection cancelled.');
    this.pending = { origin: site, state, verifier, expires: Date.now() + 600000, revision };
    let label = `Obsidian - ${vault}`;
    while (new TextEncoder().encode(label).length > 100) label = label.slice(0, -1);
    const query = new URLSearchParams({ challenge, state, device_name: label, vault });
    return { url: `${site}/connect-device?${query}`, displayCode: state.slice(0, 8).toUpperCase() };
  }

  /** Exchange a matching one-time callback only at the originally selected site. */
  async complete(params: Record<string, string>): Promise<boolean> {
    const pending = this.pending;
    if (!pending || pending.state !== params.state || Date.now() >= pending.expires) throw new Error('No matching device connection. Start connection again in Fretzee settings.');
    if (params.error === 'access_denied') { this.cancel(); return false; }
    if (!/^fda_[a-f0-9]{32}$/u.test(params.code ?? '')) throw new Error('Invalid device authorization code.');
    if (siteOrigin(await this.currentOrigin()) !== pending.origin || pending.revision !== this.revision || this.pending !== pending) throw new Error('The site changed. Start device connection again.');
    this.pending = undefined;
    const response = await this.transport({ url: pending.origin + '/api/v1/documents/devices/exchange', method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: params.code, verifier: pending.verifier }) });
    if (response.status !== 201) throw new Error('Device authorization failed or expired. Start connection again.');
    const data: unknown = response.json;
    if (!data || typeof data !== 'object' || !('token' in data) || typeof data.token !== 'string' || !/^fup_[a-f0-9]{32}$/u.test(data.token)) throw new Error('The site returned an invalid device credential.');
    const destination = siteOrigin(await this.currentOrigin());
    if (pending.revision !== this.revision || destination !== pending.origin) throw new Error('Connection cancelled or site changed. The credential was not saved.');
    await this.persist(pending.origin, data.token, () => pending.revision === this.revision);
    return true;
  }

  /** Invalidate pending requests on URL change, local disconnect or plugin unload. */
  cancel(): void { this.pending = undefined; this.revision++; }
}
