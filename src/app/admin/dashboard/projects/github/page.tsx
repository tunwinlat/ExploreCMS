/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { 
  getGitHubSettings, 
  saveGitHubToken, 
  disconnectGitHub, 
  fetchGitHubRepos, 
  importGitHubRepos,
  updateGitHubSyncMode
} from './githubActions'

interface GitHubRepo {
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
  default_branch: string
  archived: boolean
  fork: boolean
  alreadyImported: boolean
}

export default function GitHubIntegrationPage() {
  const [settings, setSettings] = useState<{ enabled: boolean; username: string | null; syncMode: string; lastSyncAt: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [fetchingRepos, setFetchingRepos] = useState(false)
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<any[] | null>(null)
  const [syncMode, setSyncMode] = useState<'all' | 'manual'>('manual')

  const loadSettings = useCallback(async () => {
    const result = await getGitHubSettings()
    if (result.error) {
      setError(result.error)
    } else {
      setSettings(result as { enabled: boolean; username: string | null; syncMode: string; lastSyncAt: string | null })
      setSyncMode((result as any).syncMode || 'manual')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleConnect = async () => {
    if (!token.trim()) return
    
    setConnecting(true)
    setError(null)
    
    const result = await saveGitHubToken(token.trim())
    
    if (result.error) {
      setError(result.error)
    } else {
      setToken('')
      await loadSettings()
    }
    
    setConnecting(false)
  }

  const handleDisconnect = async () => {
    if (!confirm('Disconnect GitHub? This will not delete any imported projects.')) return
    
    setLoading(true)
    const result = await disconnectGitHub()
    
    if (result.error) {
      setError(result.error)
    } else {
      setRepos([])
      setSelectedRepos(new Set())
      await loadSettings()
    }
    
    setLoading(false)
  }

  const handleFetchRepos = async () => {
    setFetchingRepos(true)
    setError(null)
    
    const result = await fetchGitHubRepos()
    
    if (result.error) {
      setError(result.error)
    } else {
      setRepos(result.repos || [])
    }
    
    setFetchingRepos(false)
  }

  const toggleRepoSelection = (fullName: string) => {
    const newSelected = new Set(selectedRepos)
    if (newSelected.has(fullName)) {
      newSelected.delete(fullName)
    } else {
      newSelected.add(fullName)
    }
    setSelectedRepos(newSelected)
  }

  const handleImport = async () => {
    if (selectedRepos.size === 0) return
    
    setImporting(true)
    setError(null)
    setImportResults(null)
    
    const result = await importGitHubRepos(Array.from(selectedRepos))
    
    if (result.error) {
      setError(result.error)
    } else {
      setImportResults(result.results || [])
      setSelectedRepos(new Set())
      // Refresh repos list to show imported status
      await handleFetchRepos()
    }
    
    setImporting(false)
  }

  const handleSyncModeChange = async (mode: 'all' | 'manual') => {
    setSyncMode(mode)
    await updateGitHubSyncMode(mode)
  }

  if (loading) {
    return (
      <div className="fade-in-up">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <Link href="/admin/dashboard/projects" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            ← Back to Projects
          </Link>
          <h1 className="admin-page-title">GitHub Integration</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '4rem' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div className="fade-in-up">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/admin/dashboard/projects" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          ← Back to Projects
        </Link>
        <h1 className="admin-page-title">GitHub Integration</h1>
      </div>

      {error && (
        <div style={{
          padding: '1rem 1.25rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          color: '#ef4444',
          marginBottom: '1.5rem',
        }}>
          {error}
        </div>
      )}

      {/* Connection Status */}
      <div className="glass" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: settings?.enabled ? '#22c55e' : '#94a3b8',
            }} />
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
              {settings?.enabled ? `Connected as @${settings.username}` : 'Not Connected'}
            </h2>
          </div>
          
          {settings?.enabled ? (
            <button
              onClick={handleDisconnect}
              className="btn"
              style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}
            >
              Disconnect
            </button>
          ) : null}
        </div>

        {!settings?.enabled ? (
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Connect your GitHub account to import repositories as projects. 
              You&apos;ll need a personal access token with <code>repo</code> and <code>read:user</code> scopes.
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <input
                type="password"
                placeholder="GitHub Personal Access Token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '300px',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
              <button
                onClick={handleConnect}
                disabled={connecting || !token.trim()}
                className="btn btn-primary"
                style={{ minWidth: '140px' }}
              >
                {connecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
            
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
              <a 
                href="https://github.com/settings/tokens/new?description=ExploreCMS%20Integration&scopes=repo,read:user" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: 'var(--accent-color)' }}
              >
                Create a token on GitHub →
              </a>
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sync Mode</span>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => handleSyncModeChange('manual')}
                  className="btn"
                  style={{
                    background: syncMode === 'manual' ? 'var(--accent-color)' : 'transparent',
                    color: syncMode === 'manual' ? 'white' : 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.85rem',
                  }}
                >
                  Manual Select
                </button>
                <button
                  onClick={() => handleSyncModeChange('all')}
                  className="btn"
                  style={{
                    background: syncMode === 'all' ? 'var(--accent-color)' : 'transparent',
                    color: syncMode === 'all' ? 'white' : 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.85rem',
                  }}
                >
                  All Public Repos
                </button>
              </div>
            </div>
            
            {settings?.lastSyncAt && (
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Last Sync</span>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
                  {new Date(settings.lastSyncAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Repository Selection */}
      {settings?.enabled && (
        <div className="glass" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Import Repositories</h2>
            <button
              onClick={handleFetchRepos}
              disabled={fetchingRepos}
              className="btn"
              style={{ border: '1px solid var(--border-color)' }}
            >
              {fetchingRepos ? 'Fetching...' : 'Refresh Repos'}
            </button>
          </div>

          {repos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <p>No repositories loaded yet.</p>
              <button
                onClick={handleFetchRepos}
                disabled={fetchingRepos}
                className="btn btn-primary"
                style={{ marginTop: '1rem' }}
              >
                Fetch Repositories
              </button>
            </div>
          ) : (
            <>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '1rem',
                padding: '0.75rem 1rem',
                background: 'var(--bg-color-secondary)',
                borderRadius: '8px',
              }}>
                <span style={{ fontSize: '0.9rem' }}>
                  {selectedRepos.size} selected
                </span>
                <button
                  onClick={handleImport}
                  disabled={importing || selectedRepos.size === 0}
                  className="btn btn-primary"
                >
                  {importing ? 'Importing...' : `Import ${selectedRepos.size} Projects`}
                </button>
              </div>

              {importResults && (
                <div style={{
                  padding: '1rem',
                  background: 'var(--bg-color-secondary)',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                }}>
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Import Results:</h4>
                  {importResults.map((result, i) => (
                    <div 
                      key={i}
                      style={{
                        fontSize: '0.85rem',
                        color: result.success ? '#22c55e' : '#ef4444',
                      }}
                    >
                      {result.success ? '✓' : '✗'} {result.name}
                      {result.error && ` - ${result.error}`}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {repos.map((repo) => (
                  <div
                    key={repo.id}
                    onClick={() => !repo.alreadyImported && toggleRepoSelection(repo.full_name)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      padding: '1rem',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      background: selectedRepos.has(repo.full_name) 
                        ? 'rgba(99, 102, 241, 0.1)' 
                        : repo.alreadyImported 
                          ? 'var(--bg-color-secondary)' 
                          : 'var(--bg-color)',
                      cursor: repo.alreadyImported ? 'default' : 'pointer',
                      opacity: repo.alreadyImported ? 0.6 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRepos.has(repo.full_name)}
                      disabled={repo.alreadyImported}
                      onChange={() => {}}
                      style={{ marginTop: '0.25rem' }}
                    />
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600 }}>{repo.name}</span>
                        {repo.alreadyImported && (
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '0.1rem 0.5rem',
                            background: 'var(--accent-color)',
                            color: 'white',
                            borderRadius: '20px',
                          }}>
                            Imported
                          </span>
                        )}
                        {repo.archived && (
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '0.1rem 0.5rem',
                            background: '#94a3b8',
                            color: 'white',
                            borderRadius: '20px',
                          }}>
                            Archived
                          </span>
                        )}
                        {repo.fork && (
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '0.1rem 0.5rem',
                            background: 'var(--border-color)',
                            color: 'var(--text-secondary)',
                            borderRadius: '20px',
                          }}>
                            Fork
                          </span>
                        )}
                      </div>
                      
                      {repo.description && (
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {repo.description}
                        </p>
                      )}
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {repo.language && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              background: getLanguageColor(repo.language),
                            }} />
                            {repo.language}
                          </span>
                        )}
                        <span>⭐ {repo.stargazers_count}</span>
                        <span>🍴 {repo.forks_count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    'TypeScript': '#3178C6',
    'JavaScript': '#F7DF1E',
    'Python': '#3776AB',
    'Java': '#B07219',
    'Go': '#00ADD8',
    'Rust': '#DEA584',
    'C++': '#F34B7D',
    'C': '#555555',
    'Ruby': '#701516',
    'PHP': '#4F5D95',
    'Swift': '#F05138',
    'Kotlin': '#A97BFF',
    'HTML': '#E34C26',
    'CSS': '#563D7C',
  }
  return colors[language] || '#6366F1'
}

export const runtime = 'edge';
