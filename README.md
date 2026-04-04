# ExploreCMS

ExploreCMS is a beautifully styled, self-hosted minimalistic blogging platform engineered for speed, aesthetics, and simplicity. Built on Next.js App Router and powered by Prisma + LibSQL, it's designed to be deployed effortlessly on Vercel and other serverless platforms.

## ✨ Features

* **Glassmorphic UI**: A stunning, custom-built CSS design system featuring translucent glass containers, smooth transitions, and high-performance fluid animations.
* **Animated Hero Gradient**: Dynamic flowing gradient animation on the hero title that smoothly transitions through theme colors.
* **40 Dynamic Themes**: Switch instantly between 40 gorgeous, tailor-made color palettes, each with their own specialized Google Font pairing and full Light/Dark mode variants. Themes span a wide range of aesthetics — from **Ocean Depth**, **Cyberpunk 2077**, and **Neon Synthwave** to **Aurora Borealis**, **Gothic Cathedral**, **Deep Space**, **Steampunk Workshop**, **Pixel Art 8-bit**, and many more.
* **Infinite Scroll & Inline Reading**: A frictionless user experience. Navigate a dynamic masonry grid of articles that infinitely paginates using Intersection Observers. Click any article to read it in a sleek sliding Modal Overlay without ever losing your position in the feed! 
* **Flexible Database**: Built on Prisma + LibSQL. Use a local SQLite file for development, or connect to a hosted LibSQL provider (Turso, Bunny.net) for production deployments.
* **Rich WYSIWYG Editor**: A beautifully minimal, ghost-style writing experience built on TipTap. Supports slash commands (`/`), image dropping, embedded YouTube videos, and floating toolbars to get out of your way while you write.
* **Built-in Analytics**: Complete with total site views and per-article unique view tracking, plotted in a beautiful native Admin Dashboard.
* **Instant Auto-Save & Drafts**: Never lose your writing. ExploreCMS automatically saves your progress in the background to your Drafts queue every 5 seconds.
* **Custom Favicon**: Upload a custom favicon (PNG, ICO, SVG) to personalize your site branding.
* **Popup Toast System**: Configure custom popup messages that appear to visitors on the homepage. Control display frequency (once per visitor or every visit).
* **Photo Gallery**: Create and manage photo albums with drag-and-drop organization, lightbox viewing, and optional location metadata.
* **Component System**: Enable or disable site sections (Blog, Projects, Photos) and configure which component serves as your homepage default.
* **User Management**: Multi-user support with role-based access control (OWNER, ADMIN, COLLABORATOR). Manage permissions and user accounts from the admin panel.

### 🌐 Storage Integration

**Bunny Storage (CDN)**: Store all images and assets on Bunny's global CDN.
- Supports all 11 Bunny Storage regions: Falkenstein (fsn1), Frankfurt (de), London (uk), Stockholm (se), New York (ny), Los Angeles (la), Singapore (sg), Sydney (syd), Sao Paulo (br), Johannesburg (jh)
- Automatic image URL migration when switching storage providers
- Easy setup wizard during initial configuration

**S3-Compatible Storage**: Supports AWS S3, Cloudflare R2, MinIO, and any S3-compatible storage provider.

### 🔄 External Integrations

**Craft.do Sync**: Import and sync your Craft.do documents as blog posts.
- **Read-Only Mode**: Import Craft documents as read-only posts
- **Backup Mode**: Push site posts to Craft for backup
- **Full Sync Mode**: Two-way sync between Craft and site (create, update, delete)
- Automatic Markdown conversion for seamless content transfer
- Preserve images and formatting during sync

**GitHub Integration**: Showcase your GitHub repositories as project portfolios.
- Import public repositories with one click
- Auto-generate project pages from README content
- Auto-generate cover images with language-specific colors
- Sync button to refresh project info from GitHub anytime
- Supports manual selection or importing all public repos

**Email Integration**: Configure email providers for notifications and user management.
- Support for Resend and SMTP providers
- Email verification for new users
- Password reset via email
- Configurable sender name and address

### 🗄️ Migration Tools

**Database Migration**: Migrate your entire database to any LibSQL-compatible provider.
- Connect to target database (Turso, Bunny.net, etc.)
- Test connection before migrating
- Migrate all data: users, posts, tags, views, settings, analytics
- Perfect for backups or switching database providers

**Storage Migration**: Switch between storage providers seamlessly.
- Migrate from local storage to Bunny/S3
- Switch between different S3 providers
- Automatic URL updates in all posts
- Files transferred with progress tracking

### 🔧 Setup Wizard

First-time setup is handled through an intuitive web-based wizard:
- **Step 1**: Welcome and introduction
- **Step 2**: Create your admin account (username, password, name)
- **Step 3**: Configure media storage (Bunny/S3) or skip for later
- **Step 4**: Review and complete

No manual database seeding or configuration files needed!

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- A LibSQL-compatible database (for production):
  - [Turso](https://turso.tech) (Recommended for Vercel)
  - [Bunny.net Edge Storage](https://bunny.net)
  - Local SQLite (development only)

### Development Setup

1. Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd explore-cms
npm install
```

2. Configure environment variables:

```bash
cp .env .env.local
```

Edit `.env.local` and set your database URL:

```env
# For local development with SQLite:
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key-here"
```

3. Generate the Prisma Client and sync your database:

```bash
npx prisma generate

# For local SQLite only:
npx prisma db push

# For hosted LibSQL (Turso/Bunny.net), tables are created automatically on first setup
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔐 Initial Setup

On your very first run, you will be automatically redirected to `/setup`. 

The setup wizard will guide you through creating your admin account and configuring optional media storage. Once established, the setup screen locks itself down permanently, and you will be routed straight to your new Admin Dashboard to begin writing.

## 🚀 Deploying to Vercel

### 1. Database Setup (Turso Recommended)

Create a database on Turso:

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login and create database
turso auth login
turso db create explore-cms
turso db show explore-cms

# Get connection string
turso db tokens create explore-cms
```

### 2. Deploy to Vercel

Click the button below to deploy:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

Or deploy via CLI:

```bash
npm i -g vercel
vercel --prod
```

### 3. Configure Environment Variables

Set these environment variables in your Vercel project settings:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Your LibSQL database URL | `libsql://your-db.turso.io` |
| `DATABASE_AUTH_TOKEN` | Auth token for Turso/Bunny | `eyJ...` |
| `JWT_SECRET` | Secret for session signing | Generate with `openssl rand -base64 32` |

**Note:** Do not set `DATABASE_URL` to a `file:` path on Vercel - file system is ephemeral and your data will be lost.

### 4. Run Setup

After deployment, visit your site URL. You'll be redirected to the setup wizard to create your admin account and configure storage.

## 🔌 Configuring Integrations

### Craft.do Setup

1. Get your Craft.do API credentials:
   - Open Craft.do → Settings → API Access
   - Copy your Server URL and API Token

2. Go to **Admin** → **Integrations** → **Craft.do**
   - Paste your Server URL and API Token
   - Click "Test Connection" to verify
   - Select your sync folder from the dropdown
   - Choose sync mode (Read-Only, Backup, or Full Sync)

3. Click "Save Settings" to enable the integration

### GitHub Setup

1. Create a GitHub Personal Access Token:
   - Go to GitHub → Settings → Developer Settings → Personal Access Tokens
   - Generate a new token with `repo` and `read:user` scopes

2. Go to **Admin** → **Projects** → **GitHub**
   - Paste your access token
   - Click "Connect" to link your account
   - Choose sync mode (Manual Select or All Public Repos)
   - Select repositories to import as projects

3. Projects will be created with README content, tech tags, and auto-generated cover images

### Email Setup

1. Choose your email provider:
   - **Resend**: Sign up at [resend.com](https://resend.com) and get an API key
   - **SMTP**: Use your existing email provider (Gmail, Outlook, etc.)

2. Go to **Admin** → **Integrations** → **Email**
   - Select your provider
   - Enter API key or SMTP credentials
   - Configure sender name and email address
   - Click "Test Connection" to verify
   - Save settings

## 🎨 Changing Themes

Themes can be easily previewed and activated live via the Admin Dashboard.
Navigate to **Admin** → **Settings** → **Theme & Background** to:
- Swap between 40 aesthetics globally in real-time
- Enable/disable the Dynamic Particle Background

### Particle Background

The Dynamic Particle Background creates an interactive, living backdrop for your site:

- **Cursor Reaction**: Particles are repelled from your cursor (antigravity effect)
- **Attraction**: Particles naturally attract and slowly drift toward each other
- **Merging**: When particles collide, they merge into larger particles
- **Spawning**: New particles continuously spawn at screen edges
- **Explosions**: Fleeing particles that hit larger ones cause explosive fragmentation
- **Theme-Aware**: Particle colors adapt to match your selected theme's accent color

To disable the particle background, toggle it off in **Admin** → **Settings** → **Theme & Background**.

## 🗄️ Database Architecture

ExploreCMS uses **LibSQL** (SQLite-compatible) via Prisma:

- **Development**: Local SQLite file (`file:./dev.db`)
- **Production**: Hosted LibSQL (Turso, Bunny.net, etc.)

### Database Schema

The database includes tables for:
- **Users** - Admin accounts with roles (OWNER, ADMIN, COLLABORATOR)
- **Posts** - Blog posts with rich HTML content
- **Tags** - Categorization for posts
- **SiteSettings** - Global site configuration
- **SiteAnalytics** - View tracking and analytics
- **PostView** - Per-post view statistics
- **Projects** - GitHub projects and portfolio items
- **PhotoAlbum** - Photo gallery albums
- **Photo** - Individual photos with metadata
- **PopupConfig** - Homepage popup configuration

### Database Migration

To migrate to a new database:
1. Go to **Admin** → **Settings** → **Database Migration**
2. Enter the new database URL and auth token
3. Click **"Test Connection"** to verify
4. Click **"Migrate Data"** to transfer all data
5. Update your `DATABASE_URL` environment variable in Vercel
6. Redeploy - the site now uses the new database!

**Note**: Schema migrations are applied automatically on startup. No manual migration steps required.

## 📦 Storage Architecture

### External Storage (Required for Vercel)

Vercel's filesystem is ephemeral, so **external storage is required for production**. The platform supports:

- **Bunny Storage** - Recommended for ease of use
- **AWS S3** - Industry standard
- **Cloudflare R2** - Zero egress fees
- **MinIO** - Self-hosted S3-compatible

### Storage Migration

To switch storage providers:
1. Go to **Admin** → **Settings** → **Storage Migration**
2. Select your provider (Bunny or S3-Compatible)
3. Enter credentials and CDN URL
4. Click **"Test Connection"** to verify access
5. Click **"Migrate Files"** to transfer all images
6. All post URLs are automatically updated

## ⚠️ Known Issues & Limitations

* **Favicon Format**: JPEG favicons may not display correctly in some browsers. For best compatibility, use PNG format (32x32 or 180x180 pixels recommended).
* **Bunny Storage Region Selection**: You must select the correct storage region that matches your Bunny Storage zone configuration. Using "Auto (Default)" only works for Falkenstein (fsn1) and Frankfurt (de) regions. For all other regions (LA, NY, Singapore, etc.), you must select the specific region from the dropdown.
* **Large File Migrations**: When migrating storage with many files, the transfer may pass through Vercel's serverless functions. For large migrations (>100 files), consider using direct storage-to-storage transfer tools instead.

## 📝 Environment Variables Reference

### Required

| Variable | Description | Required In |
|----------|-------------|-------------|
| `DATABASE_URL` | LibSQL connection string | All environments |
| `DATABASE_AUTH_TOKEN` | Auth token for hosted LibSQL (Turso, Bunny.net) | When using hosted DB |
| `JWT_SECRET` | Secret key for session signing | Production |
| `ENCRYPTION_KEY` | Key for encrypting sensitive tokens (API keys) | Production (recommended) |

### Optional Integration Variables

| Variable | Description | Used For |
|----------|-------------|----------|
| `CRAFT_SERVER_URL` | Craft.do Connect API URL | Craft sync (or configure via UI) |
| `CRAFT_API_TOKEN` | Craft.do Bearer token | Craft sync (or configure via UI) |
| `GITHUB_ACCESS_TOKEN` | GitHub Personal Access Token | GitHub integration (or configure via UI) |

### Database URL Examples

**Local SQLite (Development):**
```env
DATABASE_URL="file:./dev.db"
```

**Turso:**
```env
DATABASE_URL="libsql://your-db.turso.io"
DATABASE_AUTH_TOKEN="your-token"
```

**Bunny.net:**
```env
DATABASE_URL="libsql://your-db.lite.bunnydb.net/"
DATABASE_AUTH_TOKEN="your-jwt-token"
```

## 🤖 Development & AI Disclosure

This project is developed with assistance from advanced AI systems:

- **Code Generation**: Google Gemini 3.1 Pro, Moonshot Kimi K2.5, Anthropic Claude Opus 4.6, and Claude Sonnet 4.6
- **Quality Assurance**: Google Jules using Gemini 3.1 Pro for proactive performance, UX, and security reviews
- **Security Assessment**: Weekly vulnerability scans conducted by Kimi K2.5 Agent Swarm and Claude Opus 4.6
- **Penetration Testing**: Simulated attacks performed in AgentZero by MiniMax 2.5

### Production Readiness

While we employ multiple AI systems for quality assurance and security testing, this software is provided as-is. **Use at your own risk for production environments.** We welcome:
- Bug reports and issue submissions
- Security vulnerability disclosures
- Feature suggestions and pull requests
- Performance optimization recommendations

Community contributions help improve the project for everyone. Please open an issue or submit a PR if you encounter any problems.

## 📜 License

This project is licensed under the **Mozilla Public License, v. 2.0 (MPL-2.0)**. 
See the [LICENSE](LICENSE) file for more details. Any copy of the file must include the MPL header.
