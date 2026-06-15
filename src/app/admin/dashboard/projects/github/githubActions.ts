/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/auth'
import { GitHubClient, GitHubRepo, generateRepoCoverImage } from '@/lib/github'
import { getPostDb } from '@/lib/bunnyDb'
import { getSettings } from '@/lib/settings-cache'
import { encrypt, decrypt } from '@/lib/crypto'

function generateSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

function validateUrl(urlStr?: string | null) {
  if (!urlStr) return null
  try {
    const url = new URL(urlStr)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}

// Get GitHub settings
export async function getGitHubSettings() {
  const session = await verifySession()
  if (!session || session.role !== 'OWNER') {
    return { error: 'Unauthorized' }
  }

  try {
    const settings = await getSettings()

    return {
      enabled: settings?.githubEnabled || false,
      username: settings?.githubUsername || null,
      syncMode: settings?.githubSyncMode || 'manual',
      lastSyncAt: settings?.githubLastSyncAt || null,
      // Don't return the access token
    }
  } catch (err: unknown) {
    return { error: (err as Error).message }
  }
}

// Save GitHub access token
export async function saveGitHubToken(token: string) {
  const session = await verifySession()
  if (!session || session.role !== 'OWNER') {
    return { error: 'Unauthorized' }
  }

  if (!token || token.length < 10) {
    return { error: 'Invalid token' }
  }

  try {
    // Test the token first
    const client = new GitHubClient(token)
    const test = await client.testConnection()

    if (!test.success) {
      return { error: 'Invalid token: ' + test.error }
    }

    // Encrypt and save the token
    const encryptedToken = encrypt(token)
    
    await prisma.siteSettings.update({
      where: { id: 'singleton' },
      data: {
        githubEnabled: true,
        githubAccessToken: encryptedToken,
        githubUsername: test.username,
      },
    })

    return { success: true, username: test.username }
  } catch (err: unknown) {
    return { error: (err as Error).message }
  }
}

// Disconnect GitHub
export async function disconnectGitHub() {
  const session = await verifySession()
  if (!session || session.role !== 'OWNER') {
    return { error: 'Unauthorized' }
  }

  try {
    await prisma.siteSettings.update({
      where: { id: 'singleton' },
      data: {
        githubEnabled: false,
        githubAccessToken: null,
        githubUsername: null,
        githubSyncMode: 'manual',
      },
    })

    return { success: true }
  } catch (err: unknown) {
    return { error: (err as Error).message }
  }
}

// Fetch repos from GitHub
export async function fetchGitHubRepos() {
  const session = await verifySession()
  if (!session || session.role !== 'OWNER') {
    return { error: 'Unauthorized' }
  }

  try {
    const settings = await getSettings()

    if (!settings?.githubEnabled || !settings?.githubAccessToken) {
      return { error: 'GitHub not connected' }
    }

    const token = decrypt(settings.githubAccessToken) || settings.githubAccessToken
    const client = new GitHubClient(token)
    const repos = await client.getUserRepos('owner')

    // Get list of already imported repos
    const db = await getPostDb()
    const existingProjects = await db.project.findMany({
      where: { githubRepoId: { not: null } },
      select: { githubRepoId: true },
    })
    const importedIds = new Set(existingProjects.map(p => p.githubRepoId))

    return {
      repos: repos.map((repo: GitHubRepo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        html_url: repo.html_url,
        homepage: repo.homepage,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        language: repo.language,
        topics: repo.topics,
        default_branch: repo.default_branch,
        archived: repo.archived,
        fork: repo.fork,
        alreadyImported: importedIds.has(String(repo.id)),
      })),
    }
  } catch (err: unknown) {
    return { error: (err as Error).message }
  }
}

// Import selected repos as projects
export async function importGitHubRepos(repoFullNames: string[]) {
  const session = await verifySession()
  if (!session || session.role !== 'OWNER') {
    return { error: 'Unauthorized' }
  }

  if (!repoFullNames || repoFullNames.length === 0) {
    return { error: 'No repositories selected' }
  }

  try {
    const settings = await getSettings()

    if (!settings?.githubEnabled || !settings?.githubAccessToken) {
      return { error: 'GitHub not connected' }
    }

    const token = decrypt(settings.githubAccessToken) || settings.githubAccessToken
    const client = new GitHubClient(token)
    const db = await getPostDb()

    const results = []
    const now = new Date().toISOString()

    // Process in chunks of 5 to avoid rate limits while improving performance
    const chunkSize = 5;
    for (let i = 0; i < repoFullNames.length; i += chunkSize) {
      const chunk = repoFullNames.slice(i, i + chunkSize);

      const chunkPromises = chunk.map(async (fullName) => {
        try {
          const [owner, repoName] = fullName.split('/')

          // Dependent API requests need to be sequential within the mapped promise
          const repo = await client.getRepo(owner, repoName)
          const readme = await client.getReadme(owner, repoName, repo.default_branch)

          // Generate slug
          let slug = generateSlug(repo.name)
          const existing = await db.project.findUnique({ where: { slug } })
          if (existing) {
            // Using timestamp is ok here as it's just appending to slug if it already exists in DB
            slug = `${slug}-${Date.now()}`
          }

          const coverImage = generateRepoCoverImage(repo.name, repo.language)

          const project = await db.project.create({
            data: {
              title: repo.name,
              slug,
              tagline: repo.description || '',
              content: readme || '',
              contentFormat: 'markdown',
              coverImage,
              githubUrl: validateUrl(repo.html_url),
              liveUrl: validateUrl(repo.homepage || ''),
              techTags: JSON.stringify(repo.topics.length > 0 ? repo.topics : repo.language ? [repo.language] : []),
              status: repo.archived ? 'archived' : 'completed',
              published: true,
              githubRepoId: String(repo.id),
              githubRepoFullName: repo.full_name,
              githubSyncEnabled: true,
              githubLastSyncAt: now,
              githubDefaultBranch: repo.default_branch,
            },
          })

          return { success: true, name: repo.name, id: project.id }
        } catch (err: unknown) {
          return { success: false, name: fullName, error: (err as Error).message }
        }
      });

      const chunkResults = await Promise.allSettled(chunkPromises);
      for (const result of chunkResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Promise.allSettled handles rejections but we catch all in the map anyway
          results.push({ success: false, name: 'Unknown', error: result.reason });
        }
      }
    }

    // Update last sync time
    await prisma.siteSettings.update({
      where: { id: 'singleton' },
      data: { githubLastSyncAt: now },
    })

    return { results }
  } catch (err: unknown) {
    return { error: (err as Error).message }
  }
}

// Sync a single GitHub project
export async function syncGitHubProject(projectId: string) {
  const session = await verifySession()
  if (!session || session.role !== 'OWNER') {
    return { error: 'Unauthorized' }
  }

  try {
    const settings = await getSettings()

    if (!settings?.githubEnabled || !settings?.githubAccessToken) {
      return { error: 'GitHub not connected' }
    }

    const db = await getPostDb()
    const project = await db.project.findUnique({
      where: { id: projectId },
    })

    if (!project?.githubRepoFullName) {
      return { error: 'Project not linked to GitHub' }
    }

    const token = decrypt(settings.githubAccessToken) || settings.githubAccessToken
    const client = new GitHubClient(token)
    const [owner, repoName] = project.githubRepoFullName.split('/')

    // Get repo details
    const repo = await client.getRepo(owner, repoName)
    
    // Get README content
    const readme = await client.getReadme(owner, repoName, repo.default_branch)
    
    const now = new Date().toISOString()

    // Update project
    await db.project.update({
      where: { id: projectId },
      data: {
        title: repo.name,
        tagline: repo.description || project.tagline,
        content: readme || project.content,
        githubUrl: validateUrl(repo.html_url),
        liveUrl: validateUrl(repo.homepage || project.liveUrl),
        techTags: JSON.stringify(repo.topics.length > 0 ? repo.topics : repo.language ? [repo.language] : JSON.parse(project.techTags || '[]')),
        status: repo.archived ? 'archived' : project.status,
        githubLastSyncAt: now,
        githubDefaultBranch: repo.default_branch,
      },
    })

    return { success: true }
  } catch (err: unknown) {
    return { error: (err as Error).message }
  }
}

// Update sync mode (all or manual)
export async function updateGitHubSyncMode(mode: 'all' | 'manual') {
  const session = await verifySession()
  if (!session || session.role !== 'OWNER') {
    return { error: 'Unauthorized' }
  }

  try {
    await prisma.siteSettings.update({
      where: { id: 'singleton' },
      data: { githubSyncMode: mode },
    })

    return { success: true }
  } catch (err: unknown) {
    return { error: (err as Error).message }
  }
}

// Auto-sync all enabled projects (for cron/background job)
export async function syncAllGitHubProjects() {
  try {
    const settings = await getSettings()

    if (!settings?.githubEnabled || !settings?.githubAccessToken) {
      return { error: 'GitHub not connected' }
    }

    const db = await getPostDb()
    
    // Get all projects with sync enabled
    const projects = await db.project.findMany({
      where: {
        githubRepoId: { not: null },
        githubSyncEnabled: true,
      },
    })

    const token = decrypt(settings.githubAccessToken) || settings.githubAccessToken
    const client = new GitHubClient(token)
    const results = []
    const now = new Date().toISOString()

    // Process in chunks of 5 to avoid rate limits while improving performance
    const chunkSize = 5;
    for (let i = 0; i < projects.length; i += chunkSize) {
      const chunk = projects.slice(i, i + chunkSize);

      const chunkPromises = chunk.map(async (project) => {
        try {
          if (!project.githubRepoFullName) {
            return { success: false, name: 'Unknown', error: 'Missing repo full name' }
          }

          const [owner, repoName] = project.githubRepoFullName.split('/')

          // Dependent API requests need to be sequential
          const repo = await client.getRepo(owner, repoName)
          const readme = await client.getReadme(owner, repoName, repo.default_branch)

          await db.project.update({
            where: { id: project.id },
            data: {
              title: repo.name,
              tagline: repo.description || project.tagline,
              content: readme || project.content,
              githubUrl: validateUrl(repo.html_url),
              liveUrl: validateUrl(repo.homepage || project.liveUrl),
              techTags: JSON.stringify(repo.topics.length > 0 ? repo.topics : repo.language ? [repo.language] : JSON.parse(project.techTags || '[]')),
              status: repo.archived ? 'archived' : project.status,
              githubLastSyncAt: now,
            },
          })

          return { success: true, name: repo.name }
        } catch (err: unknown) {
          return { success: false, name: project.githubRepoFullName || 'Unknown', error: (err as Error).message }
        }
      });

      const chunkResults = await Promise.allSettled(chunkPromises);
      for (const result of chunkResults) {
        if (result.status === 'fulfilled') {
          // If the mapping returned early for missing repo full name, we might just skip adding to results to mimic original
          if (result.value.error === 'Missing repo full name') continue;
          results.push(result.value);
        } else {
          results.push({ success: false, name: 'Unknown', error: result.reason });
        }
      }
    }

    await prisma.siteSettings.update({
      where: { id: 'singleton' },
      data: { githubLastSyncAt: now },
    })

    return { results }
  } catch (err: unknown) {
    return { error: (err as Error).message }
  }
}
