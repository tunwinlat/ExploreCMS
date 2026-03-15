# ExploreCMS

ExploreCMS is a beautifully styled, self-hosted minimalistic blogging platform engineered for speed, aesthetics, and simplicity. Built on Next.js App Router and powered by Prisma + LibSQL, it's designed to be deployed effortlessly on Vercel and other serverless platforms.

## ✨ Features

* **Glassmorphic UI**: A stunning, custom-built CSS design system featuring translucent glass containers, smooth transitions, and high-performance fluid animations.
* **Animated Hero Gradient**: Dynamic flowing gradient animation on the hero title that smoothly transitions through theme colors.
* **41 Dynamic Themes**: Switch instantly between 41 gorgeous, tailor-made color palettes, each with their own specialized Google Font pairing and full Light/Dark mode variants. Themes span a wide range of aesthetics — from **Ocean Depth**, **Cyberpunk 2077**, and **Neon Synthwave** to **Aurora Borealis**, **Gothic Cathedral**, **Deep Space**, **Steampunk Workshop**, **Pixel Art 8-bit**, and many more.
* **Infinite Scroll & Inline Reading**: A frictionless user experience. Navigate a dynamic masonry grid of articles that infinitely paginates using Intersection Observers. Click any article to read it in a sleek sliding Modal Overlay without ever losing your position in the feed! 
* **Flexible Database**: Built on Prisma + LibSQL. Use a local SQLite file for development, or connect to a hosted LibSQL provider (Turso, Bunny.net) for production deployments.
* **Rich WYSIWYG Editor**: A beautifully minimal, ghost-style writing experience built on TipTap. Supports slash commands (`/`), image dropping, embedded YouTube videos, and floating toolbars to get out of your way while you write.
* **Built-in Analytics**: Complete with total site views and per-article unique view tracking, plotted in a beautiful native Admin Dashboard.
* **Instant Auto-Save & Drafts**: Never lose your writing. ExploreCMS automatically saves your progress in the background to your Drafts queue every 5 seconds.
* **Custom Favicon**: Upload a custom favicon (PNG recommended) to personalize your site branding.

### 🌐 Storage Integration

**Bunny Storage (CDN)**: Store all images and assets on Bunny's global CDN. When connecting, all existing local images are migrated to storage and post URLs are automatically updated. New uploads go directly to Bunny Storage.
- Supports all 11 Bunny Storage regions: Falkenstein (fsn1), Frankfurt (de), London (uk), Stockholm (se), New York (ny), Los Angeles (la), Singapore (sg), Sydney (syd), Sao Paulo (br), Johannesburg (jh)
- Automatic image URL migration when connecting/disconnecting
- Easy setup wizard during initial configuration

**S3-Compatible Storage**: Also supports AWS S3, Cloudflare R2, MinIO, and any S3-compatible storage provider.

### 🔧 One-Command Setup Wizard

First-time setup is handled through a beautiful web-based wizard that runs on initial deployment:
- **Step 1**: Create your admin account (username, password, name)
- **Step 2**: Configure media storage (Bunny Storage or skip for later)
- **Step 3**: Review and complete

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
npx prisma db push
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔐 Initial Setup

On your very first run, you will be automatically redirected to `/setup`. 

The setup wizard will guide you through:
1. **Creating your admin account** - Set up the OWNER account with full access
2. **Configuring media storage** - Connect Bunny Storage or S3-compatible storage for images
3. **Review & complete** - Confirm your settings and finish setup

Once established, the setup screen locks itself down permanently, and you will be routed straight to your new Admin Dashboard to begin writing.

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
| `DATABASE_AUTH_TOKEN` | Auth token for Turso (if needed) | `eyJ...` |
| `JWT_SECRET` | Secret for session signing | Generate with `openssl rand -base64 32` |

### 4. Run Setup

After deployment, visit your site URL. You'll be redirected to the setup wizard to create your admin account and configure storage.

## 🎨 Changing Themes

Themes can be easily previewed and activated live via the Admin Dashboard.
Navigate to **Admin** -> **Settings** -> **Theme Configurator** to swap between aesthetics globally in real-time.

## 🗄️ Database Architecture

ExploreCMS uses **LibSQL** (SQLite-compatible) via Prisma:

- **Development**: Local SQLite file (`file:./dev.db`)
- **Production**: Hosted LibSQL (Turso, Bunny.net, etc.)

### Database Schema

The database includes tables for:
- **Users** - Admin accounts with roles (OWNER, COLLABORATOR)
- **Posts** - Blog posts with rich HTML content
- **Tags** - Categorization for posts
- **SiteSettings** - Global site configuration
- **SiteAnalytics** - View tracking and analytics
- **PostView** - Per-post view statistics

## ⚠️ Known Issues & Limitations

* **Favicon Format**: JPEG favicons may not display correctly in some browsers. For best compatibility, use PNG format (32x32 or 180x180 pixels recommended).
* **Bunny Storage Region Selection**: You must select the correct storage region that matches your Bunny Storage zone configuration. Using "Auto (Default)" only works for Falkenstein (fsn1) and Frankfurt (de) regions. For all other regions (LA, NY, Singapore, etc.), you must select the specific region from the dropdown.
* **Image Migration**: When connecting Bunny Storage, the migration only processes images in posts. Standalone files in `public/uploads/` that are not referenced in posts will not be automatically migrated.

## 📝 Environment Variables Reference

### Required

| Variable | Description | Required In |
|----------|-------------|-------------|
| `DATABASE_URL` | LibSQL connection string | All environments |
| `JWT_SECRET` | Secret key for session signing | Production |

### Optional (Storage)

| Variable | Description |
|----------|-------------|
| `BUNNY_STORAGE_REGION` | Bunny Storage region |
| `BUNNY_STORAGE_ZONE_NAME` | Bunny Storage zone name |
| `BUNNY_STORAGE_API_KEY` | Bunny Storage API key |
| `BUNNY_STORAGE_CDN_URL` | Bunny CDN URL |
| `S3_ENDPOINT` | S3-compatible endpoint |
| `S3_ACCESS_KEY_ID` | S3 access key |
| `S3_SECRET_ACCESS_KEY` | S3 secret key |
| `S3_BUCKET` | S3 bucket name |
| `S3_REGION` | S3 region (default: us-east-1) |

## 📜 License

This project is licensed under the **Mozilla Public License, v. 2.0 (MPL-2.0)**. 
See the [LICENSE](LICENSE) file for more details. Any copy of the file must include the MPL header.
