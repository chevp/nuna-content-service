/** HTTP client for the kaga graph service (Node API). */

import type { AppConfig } from '../config';

export interface KagaNode {
  id: string;
  kind: string;
  label: string;
  payload: Record<string, unknown>;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface KagaNodeInput {
  kind: string;
  label: string;
  payload?: Record<string, unknown>;
}

interface KagaNodePage {
  content: KagaNode[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export class KagaClient {
  private readonly base: string;
  private readonly headers: Record<string, string>;

  constructor(config: AppConfig['kaga']) {
    this.base = config.url.replace(/\/$/, '');
    this.headers = {
      'Content-Type': 'application/json',
      'X-Api-Key': config.apiKey,
    };
  }

  async createNode(input: KagaNodeInput): Promise<KagaNode> {
    const res = await fetch(`${this.base}/nodes`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`kaga POST /nodes → ${res.status}`);
    return res.json() as Promise<KagaNode>;
  }

  async getNode(id: string): Promise<KagaNode | null> {
    const res = await fetch(`${this.base}/nodes/${encodeURIComponent(id)}`, {
      headers: this.headers,
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`kaga GET /nodes/${id} → ${res.status}`);
    return res.json() as Promise<KagaNode>;
  }

  async updateNode(id: string, input: KagaNodeInput): Promise<KagaNode> {
    const res = await fetch(`${this.base}/nodes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`kaga PATCH /nodes/${id} → ${res.status}`);
    return res.json() as Promise<KagaNode>;
  }

  async deleteNode(id: string): Promise<boolean> {
    const res = await fetch(`${this.base}/nodes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (res.status === 404) return false;
    if (!res.ok) throw new Error(`kaga DELETE /nodes/${id} → ${res.status}`);
    return true;
  }

  /** List all nodes of a given kind (tenant-scoped by API key). */
  async listNodes(kind: string, size = 200): Promise<KagaNode[]> {
    const url = `${this.base}/nodes?kind=${encodeURIComponent(kind)}&size=${size}`;
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) throw new Error(`kaga GET /nodes?kind=${kind} → ${res.status}`);
    const page = (await res.json()) as KagaNodePage;
    return page.content;
  }
}
