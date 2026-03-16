/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  homepage: string | null
  stargazers_count: number
  forks_count: number
  language: string | null
  topics: string[]
  created_at: string
  updated_at: string
  pushed_at: string
  default_branch: string
  private: boolean
  archived: boolean
  fork: boolean
}

export interface GitHubReadme {
  content: string
  encoding: 'base64' | string
  html_url: string
}

export class GitHubClient {
  private token: string

  constructor(accessToken: string) {
    this.token = accessToken
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...options.headers,
      },
    })

    if (!res.ok) {
      const error = await res.text()
      throw new Error(`GitHub API error ${res.status}: ${error}`)
    }

    return res.json()
  }

  async getUserRepos(type: 'all' | 'owner' | 'member' = 'owner', perPage = 100): Promise<GitHubRepo[]> {
    const repos: GitHubRepo[] = []
    let page = 1
    
    while (true) {
      const url = `https://api.github.com/user/repos?type=${type}&sort=updated&per_page=${perPage}&page=${page}`
      const pageRepos = await this.request<GitHubRepo[]>(url)
      
      if (pageRepos.length === 0) break
      
      repos.push(...pageRepos)
      
      if (pageRepos.length < perPage) break
      page++
    }
    
    // Filter out private repos - only return public ones
    return repos.filter(repo => !repo.private)
  }

  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    return this.request<GitHubRepo>(`https://api.github.com/repos/${owner}/${repo}`)
  }

  async getReadme(owner: string, repo: string, branch?: string): Promise<string | null> {
    try {
      const ref = branch ? `?ref=${branch}` : ''
      const readme = await this.request<GitHubReadme>(
        `https://api.github.com/repos/${owner}/${repo}/readme${ref}`
      )
      
      if (readme.encoding === 'base64') {
        return atob(readme.content.replace(/\s/g, ''))
      }
      return readme.content
    } catch {
      return null
    }
  }

  async testConnection(): Promise<{ success: boolean; username?: string; error?: string }> {
    try {
      const user = await this.request<{ login: string }>('https://api.github.com/user')
      return { success: true, username: user.login }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }
}

// Generate a cover image for a repository using a placeholder service
export function generateRepoCoverImage(repoName: string, language?: string | null): string {
  // Use a gradient placeholder service or generate an SVG
  const colors = getLanguageColors(language)
  const svg = `
<svg width="1200" height="600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colors[1]};stop-opacity:1" />
    </linearGradient>
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feBlend in="SourceGraphic" mode="overlay"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#grad)" />
  <rect width="100%" height="100%" fill="#000" opacity="0.3" filter="url(#noise)" />
  <text x="50%" y="45%" font-family="system-ui, -apple-system, sans-serif" font-size="72" font-weight="bold" fill="white" text-anchor="middle" opacity="0.95">${escapeXml(repoName)}</text>
  ${language ? `<text x="50%" y="60%" font-family="system-ui, -apple-system, sans-serif" font-size="36" fill="white" text-anchor="middle" opacity="0.8">${escapeXml(language)}</text>` : ''}
  <text x="50%" y="85%" font-family="system-ui, -apple-system, sans-serif" font-size="24" fill="white" text-anchor="middle" opacity="0.6">GitHub Repository</text>
</svg>
  `.trim()
  
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function getLanguageColors(language?: string | null): [string, string] {
  const colors: Record<string, [string, string]> = {
    'TypeScript': ['#3178C6', '#235A97'],
    'JavaScript': ['#F7DF1E', '#E6C200'],
    'Python': ['#3776AB', '#2D5A8A'],
    'Java': ['#B07219', '#8B5A12'],
    'Go': ['#00ADD8', '#008DB8'],
    'Rust': ['#DEA584', '#C18765'],
    'C++': ['#F34B7D', '#D1355F'],
    'C': ['#555555', '#333333'],
    'Ruby': ['#701516', '#4A0E0E'],
    'PHP': ['#4F5D95', '#3A466E'],
    'Swift': ['#F05138', '#D13A22'],
    'Kotlin': ['#A97BFF', '#8B5FD9'],
    'React': ['#61DAFB', '#3BA9D4'],
    'Vue': ['#4FC08D', '#3A9A6D'],
    'Angular': ['#DD0031', '#B80028'],
    'HTML': ['#E34C26', '#C13A16'],
    'CSS': ['#563D7C', '#3E2B5A'],
    'Shell': ['#89E051', '#6BC23A'],
    'Dockerfile': ['#384D54', '#2A3A40'],
  }
  
  return colors[language || ''] || ['#6366F1', '#4F46E5'] // Default indigo gradient
}
