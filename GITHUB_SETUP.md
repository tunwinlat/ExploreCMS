# GitHub Integration Setup

This document explains how to set up the GitHub integration for importing repositories as projects.

## Overview

The GitHub integration allows you to:
- Import your GitHub repositories as projects automatically
- Sync README content as project descriptions
- Auto-generate cover images for each repository
- Keep projects in sync with GitHub (manual or automatic)

## Setup Steps

### 1. Create a GitHub Personal Access Token

1. Go to **GitHub Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **Generate new token (classic)**
3. Give your token a descriptive name (e.g., "ExploreCMS Integration")
4. Select the following scopes:
   - ✅ `repo` - Full control of private repositories
   - ✅ `read:user` - Read user profile data
5. Click **Generate token**
6. **Copy the token immediately** - you won't be able to see it again!

### 2. Connect in ExploreCMS

1. Go to **Admin Dashboard** → **Projects** → **GitHub**
2. Paste your Personal Access Token in the input field
3. Click **Connect**
4. You should see your GitHub username displayed when connected

### 3. Import Repositories

After connecting:

1. Click **Fetch Repositories** to load your public repositories
2. Select the repositories you want to import:
   - Check the checkbox next to each repo
   - Already imported repos are marked and cannot be re-imported
3. Click **Import X Projects** to create projects from selected repos

### 4. Sync Options

Choose your sync mode:

- **Manual Select** (default): You manually choose which repos to import
- **All Public Repos**: Automatically import all your public repos (not yet implemented - requires background job setup)

## What Gets Imported

For each repository, the following fields are automatically populated:

| Project Field | Source |
|--------------|--------|
| Title | Repository name |
| Slug | Generated from repo name |
| Tagline | Repository description |
| Content | README.md content (Markdown) |
| GitHub URL | Repository URL |
| Live URL | Repository homepage (if set) |
| Tech Tags | Repository topics or primary language |
| Status | `archived` if repo archived, otherwise `completed` |
| Cover Image | Auto-generated SVG with repo name and language |

## Syncing Projects

### Manual Sync

Each GitHub-linked project has a **Sync** button in the projects list:

1. Go to **Admin Dashboard** → **Projects**
2. Find the project with the GitHub badge
3. Click the **Sync** button
4. The project will be updated with the latest:
   - README content
   - Description
   - Topics/Language
   - URLs
   - Archive status

### Bulk Sync (Admin only)

To sync all GitHub-linked projects at once:

```bash
# Run the sync action (requires admin access)
curl -X POST /api/github/sync-all
```

Or use the server action directly in your code.

## Auto-Generated Cover Images

When you don't set a custom cover image, one is automatically generated featuring:
- Repository name in large text
- Primary programming language
- A gradient background based on the language color

The cover image is an SVG stored as a data URL.

## Security Notes

- Your GitHub token is stored encrypted in the database
- Only public repositories are fetched and imported
- The token is used server-side only
- You can disconnect GitHub at any time (this won't delete imported projects)

## Troubleshooting

### "Invalid token" error
- Make sure you copied the full token (starts with `ghp_`)
- Ensure the token has `repo` and `read:user` scopes
- Check if the token has expired

### Repositories not loading
- Verify your GitHub account has public repositories
- Check that the token hasn't been revoked on GitHub
- Try disconnecting and reconnecting

### Sync not working
- Ensure the repository still exists on GitHub
- Check that the repository hasn't been made private
- Verify your token still has access to the repository

## Database Schema Changes

The integration adds the following fields:

### Project Model
- `githubRepoId` - GitHub's numeric repo ID
- `githubRepoFullName` - owner/repo format
- `githubSyncEnabled` - Whether auto-sync is enabled
- `githubLastSyncAt` - Last sync timestamp
- `githubDefaultBranch` - Branch to fetch README from
- `contentFormat` - Set to 'markdown' for GitHub imports

### SiteSettings Model
- `githubEnabled` - Integration enabled flag
- `githubAccessToken` - Encrypted OAuth token
- `githubUsername` - Connected GitHub username
- `githubSyncMode` - 'all' or 'manual'
- `githubLastSyncAt` - Last bulk sync timestamp

## API Rate Limits

GitHub API has rate limits:
- **Authenticated**: 5,000 requests per hour
- For most users, this is more than enough for regular syncs

If you hit rate limits, sync operations will fail until the limit resets (usually 1 hour).
