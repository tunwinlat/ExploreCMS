import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GitHubClient, generateRepoCoverImage } from '@/lib/github'

describe('GitHubClient', () => {
  let client: GitHubClient

  beforeEach(() => {
    client = new GitHubClient('fake-token')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('testConnection', () => {
    it('returns success and username on valid connection', async () => {
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ login: 'octocat' }),
      } as Response)

      const result = await client.testConnection()

      expect(result).toEqual({ success: true, username: 'octocat' })
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/user',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer fake-token',
          }),
        })
      )
    })

    it('returns failure and error message when fetch fails', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Bad credentials',
      } as Response)

      const result = await client.testConnection()

      expect(result).toEqual({ success: false, error: 'GitHub API error 401: Bad credentials' })
    })

    it('returns failure and error message when fetch throws', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'))

      const result = await client.testConnection()

      expect(result).toEqual({ success: false, error: 'Network error' })
    })
  })

  describe('getRepo', () => {
    it('returns requested repository data', async () => {
      const mockRepo = { id: 1, name: 'explore-cms' }
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockRepo,
      } as Response)

      const result = await client.getRepo('owner', 'explore-cms')

      expect(result).toEqual(mockRepo)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/explore-cms',
        expect.any(Object)
      )
    })
  })

  describe('getUserRepos', () => {
    it('handles pagination and filters out private repositories', async () => {
      const page1 = [
        { id: 1, name: 'public-repo-1', private: false },
        { id: 2, name: 'private-repo-1', private: true },
      ]
      const page2 = [
        { id: 3, name: 'public-repo-2', private: false },
      ]

      const mockFetch = vi.spyOn(global, 'fetch')
        // Page 1 (2 items, matching perPage for loop continuation)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => page1,
        } as Response)
        // Page 2 (1 item, less than perPage, stops loop)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => page2,
        } as Response)

      // Set perPage to 2 so page1 triggers a second page fetch, but page2 stops it
      const result = await client.getUserRepos('owner', 2)

      expect(result).toEqual([
        { id: 1, name: 'public-repo-1', private: false },
        { id: 3, name: 'public-repo-2', private: false },
      ])

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://api.github.com/user/repos?type=owner&sort=updated&per_page=2&page=1',
        expect.any(Object)
      )
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://api.github.com/user/repos?type=owner&sort=updated&per_page=2&page=2',
        expect.any(Object)
      )
    })

    it('stops fetching if an empty array is returned', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response)

      const result = await client.getUserRepos('owner', 100)

      expect(result).toEqual([])
    })
  })

  describe('getReadme', () => {
    it('decodes base64 encoded readme correctly', async () => {
      // "Hello World" in base64 is "SGVsbG8gV29ybGQ="
      // We add some whitespace to simulate GitHub's multiline base64 responses
      const mockReadme = {
        content: "SGVsbG8g\n V29ybGQ=",
        encoding: 'base64',
        html_url: 'https://github.com/owner/repo/blob/main/README.md',
      }

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockReadme,
      } as Response)

      const result = await client.getReadme('owner', 'repo')

      expect(result).toBe('Hello World')
    })

    it('returns raw content if encoding is not base64', async () => {
      const mockReadme = {
        content: '# Hello World',
        encoding: 'string',
        html_url: 'https://github.com/owner/repo/blob/main/README.md',
      }

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockReadme,
      } as Response)

      const result = await client.getReadme('owner', 'repo', 'develop')

      expect(result).toBe('# Hello World')
      // Ensure branch was included in the request
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/readme?ref=develop',
        expect.any(Object)
      )
    })

    it('returns null if the request fails (e.g., readme does not exist)', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      } as Response)

      const result = await client.getReadme('owner', 'repo')

      expect(result).toBeNull()
    })
  })
})

describe('generateRepoCoverImage', () => {
  it('returns a valid SVG data URI', () => {
    const result = generateRepoCoverImage('my-repo')

    expect(result).toMatch(/^data:image\/svg\+xml;base64,/)
    // Verify it can be decoded back to SVG
    const base64 = result.split(',')[1]
    const svg = Buffer.from(base64, 'base64').toString('utf-8')
    expect(svg).toContain('<svg')
    expect(svg).toContain('my-repo')
  })

  it('escapes XML characters in repository names', () => {
    const result = generateRepoCoverImage('<my&repo>"\'')
    const base64 = result.split(',')[1]
    const svg = Buffer.from(base64, 'base64').toString('utf-8')

    expect(svg).toContain('&lt;my&amp;repo&gt;&quot;&apos;')
    expect(svg).not.toContain('<my&repo>')
  })

  it('uses specific colors for known languages', () => {
    const result = generateRepoCoverImage('react-app', 'TypeScript')
    const base64 = result.split(',')[1]
    const svg = Buffer.from(base64, 'base64').toString('utf-8')

    // TypeScript colors from the getLanguageColors map
    expect(svg).toContain('stop-color:#3178C6')
    expect(svg).toContain('stop-color:#235A97')
    expect(svg).toContain('TypeScript') // Includes the language text
  })

  it('uses fallback colors when language is unknown or null', () => {
    const result = generateRepoCoverImage('unknown-app', 'Brainfuck')
    const base64 = result.split(',')[1]
    const svg = Buffer.from(base64, 'base64').toString('utf-8')

    // Default indigo gradient colors
    expect(svg).toContain('stop-color:#6366F1')
    expect(svg).toContain('stop-color:#4F46E5')
    expect(svg).toContain('Brainfuck') // Still includes the language text
  })
})
