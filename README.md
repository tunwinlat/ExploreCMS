# ExploreCMS

ExploreCMS is a beautifully styled, self-hosted minimalistic blogging platform engineered for speed, aesthetics, and simplicity. Built on Next.js App Router and powered by a zero-configuration embedded SQLite database, it's designed to be deployed effortlessly.

## ✨ Features

* **Glassmorphic UI**: A stunning, custom-built CSS design system featuring translucent glass containers, smooth transitions, and high-performance fluid animations.
* **21 Dynamic Themes**: Switch instantly between 21 gorgeous, tailor-made color palettes (Ocean, Cyberpunk, Forest, Sunset, etc), each with their own specialized Google Font pairing and full Light/Dark mode variants.
* **Infinite Scroll & Inline Reading**: A frictionless user experience. Navigate a dynamic masonry grid of articles that infinitely paginates using Intersection Observers. Click any article to read it in a sleek sliding Modal Overlay without ever losing your position in the feed! 
* **Zero-Setup Database**: Built entirely on top of Prisma + SQLite. You don't need a sprawling Postgres cluster or a Redis instance to start writing. Just `npm run dev` and your database lives securely right next to your code.
* **Rich WYSIWYG Editor**: A beautifully minimal, ghost-style writing experience built on TipTap. Supports slash commands (`/`), image dropping, embedded YouTube videos, and floating toolbars to get out of your way while you write.
* **Built-in Analytics**: Complete with total site views and per-article unique view tracking, plotted in a beautiful native Admin Dashboard.
* **Instant Auto-Save & Drafts**: Never lose your writing. ExploreCMS automatically saves your progress in the background to your Drafts queue every 5 seconds.
* **Bunny Database Edge Storage**: Need to go remote? Easily connect a cloud-distributed Bunny DB (libSQL) via the Admin Settings. The platform features an intelligent, zero-data-loss bidirectional migration sync to seamlessly push/pull data up to the edge and back down to local SQLite on demand! An **introspection-based incremental schema syncer** ensures future schema changes (new fields, new tables) are safely applied to the remote DB without losing existing data.
  > [!NOTE]
  > **Bunny DB Setup**: Requires `@prisma/adapter-libsql@6.19.2` (must match your Prisma engine version). The schema syncer uses `PRAGMA table_info()` to detect and apply only missing columns via `ALTER TABLE ADD COLUMN`, making schema evolution safe. Images are always stored locally in `public/uploads/` regardless of which database is active.

## 🚀 Getting Started

First, clone the repository and install dependencies:

```bash
npm install
```

Generate the Prisma Client and sync your local SQLite database:

```bash
npx prisma generate
npx prisma db push
```

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔐 Initial Setup

On your very first run, you will be automatically redirected to `/setup`. 

This secure setup widget will ask you to create your initial `OWNER` Admin account credentials. Once established, this screen locks itself down permanently, and you will be routed straight to your new Admin Dashboard to begin writing. 

## 🎨 Changing Themes

Themes can be easily previewed and activated live via the Admin Dashboard.
Navigate to **Admin** -> **Settings** -> **Theme Configurator** to swap between aesthetics globally in real-time.

## 🗄️ Database & Security

ExploreCMS is designed as a monolithic, self-contained architecture!
Your entire site history including draft contents, public posts, analytics, images, and user accounts are securely encapsulated inside `./prisma/dev.db`.

**Note:** The `.gitignore` is intentionally configured to never track this `.db` file or user uploads directly to ensure your data stays private and secure!

## 📜 License

This project is licensed under the **Mozilla Public License, v. 2.0 (MPL-2.0)**. 
See the [LICENSE](LICENSE) file for more details. Any copy of the file must include the MPL header.
