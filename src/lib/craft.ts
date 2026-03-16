/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export interface CraftFolder {
  id: string
  name: string
  documentCount: number
  folders: CraftFolder[]
}

export interface CraftDocument {
  id: string
  title: string
  lastModifiedAt?: string
  createdAt?: string
  clickableLink?: string
}

export interface CraftBlock {
  id: string
  type: string
  textStyle?: string
  markdown?: string
  content?: CraftBlock[]
  url?: string
  altText?: string
}

export interface CraftConnectionInfo {
  space: {
    id: string
    timezone: string
    time: string
    friendlyDate: string
  }
  utc: { time: string }
  urlTemplates?: { app?: string }
}

export class CraftClient {
  private baseUrl: string
  private token: string

  constructor(serverUrl: string, apiToken: string) {
    this.baseUrl = serverUrl.replace(/\/$/, '')
    this.token = apiToken
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    accept = 'application/json'
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': accept,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Craft API error ${res.status}: ${text || res.statusText}`)
    }

    if (accept === 'text/markdown') {
      return (await res.text()) as unknown as T
    }

    return res.json()
  }

  async getConnectionInfo(): Promise<CraftConnectionInfo> {
    return this.request<CraftConnectionInfo>('/connection')
  }

  async testConnection(checkWriteAccess = false): Promise<{ success: boolean; spaceId?: string; writeAccess?: boolean; error?: string }> {
    try {
      const info = await this.getConnectionInfo()
      let writeAccess: boolean | undefined
      if (checkWriteAccess) {
        writeAccess = await this.testWriteAccess()
      }
      return { success: true, spaceId: info.space.id, writeAccess }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  async testWriteAccess(): Promise<boolean> {
    try {
      // Try creating a temporary folder to test write permissions
      const testName = `_explorecms_write_test_${Date.now()}`
      const res = await this.request<{ items: { id: string }[] }>(
        '/folders',
        {
          method: 'POST',
          body: JSON.stringify({ folders: [{ name: testName }] }),
        }
      )
      // Clean up: delete the test folder immediately
      if (res.items?.[0]?.id) {
        try {
          await this.request('/folders', {
            method: 'DELETE',
            body: JSON.stringify({ folderIds: [res.items[0].id] }),
          })
        } catch {
          // Cleanup failure is non-critical
        }
      }
      return true
    } catch {
      return false
    }
  }

  async getFolders(): Promise<CraftFolder[]> {
    const res = await this.request<{ items: CraftFolder[] }>('/folders')
    return res.items
  }

  async getDocuments(
    folderId: string,
    fetchMetadata = true
  ): Promise<CraftDocument[]> {
    const params = new URLSearchParams({
      folderId,
      fetchMetadata: String(fetchMetadata),
    })
    const res = await this.request<{ items: CraftDocument[] }>(
      `/documents?${params}`
    )
    return res.items
  }

  async getDocumentMarkdown(documentId: string): Promise<string> {
    return this.request<string>(
      `/blocks?id=${encodeURIComponent(documentId)}`,
      {},
      'text/markdown'
    )
  }

  async getDocumentBlocks(documentId: string): Promise<CraftBlock> {
    return this.request<CraftBlock>(
      `/blocks?id=${encodeURIComponent(documentId)}`
    )
  }

  async createDocument(
    folderId: string,
    title: string
  ): Promise<{ id: string; title: string }> {
    const res = await this.request<{ items: { id: string; title: string }[] }>(
      '/documents',
      {
        method: 'POST',
        body: JSON.stringify({
          documents: [{ title }],
          destination: { folderId },
        }),
      }
    )
    return res.items[0]
  }

  async insertBlocks(
    documentId: string,
    markdown: string
  ): Promise<void> {
    await this.request('/blocks', {
      method: 'POST',
      body: JSON.stringify({
        markdown,
        position: { position: 'end', pageId: documentId },
      }),
    })
  }

  async updateDocumentContent(
    documentId: string,
    markdown: string
  ): Promise<void> {
    // Delete only direct children — Craft auto-removes nested blocks
    const doc = await this.getDocumentBlocks(documentId)
    if (doc.content && doc.content.length > 0) {
      const directChildIds = doc.content.map(b => b.id)
      await this.request('/blocks', {
        method: 'DELETE',
        body: JSON.stringify({ blockIds: directChildIds }),
      })
    }
    // Insert fresh content from the start of the document
    await this.request('/blocks', {
      method: 'POST',
      body: JSON.stringify({
        markdown,
        position: { position: 'start', pageId: documentId },
      }),
    })
  }
}
