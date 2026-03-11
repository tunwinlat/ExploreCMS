import Link from "next/link";
import { prisma } from "@/lib/db";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ViewTracker } from "@/components/ViewTracker";
import DynamicPostGrid from "@/components/DynamicPostGrid";

export default async function Home() {
  const limit = 10
  const posts = await prisma.post.findMany({
    where: { published: true },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    include: {
      author: true, // Fetch full author to satisfy the lack of 'select: { firstName }'
      tags: true,
      views: true
    }
  })

  // Compute cursor logic exactly like the API
  let nextCursor: string | undefined = undefined;
  const renderPosts = [...posts]
  
  if (renderPosts.length > limit) {
    const nextItem = renderPosts.pop() 
    nextCursor = nextItem!.id
  }

  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' }
  });

  const allTagsArray = await prisma.tag.findMany({ select: { name: true } })
  const allTags = allTagsArray.map(t => t.name)
  
  let navItems = []
  try {
    navItems = JSON.parse(settings?.navigationConfig || '[]')
  } catch(e) {
    navItems = [{ id: 'latest', type: 'latest', label: 'Latest' }, { id: 'featured', type: 'featured', label: 'Featured' }]
  }

  return (
    <div className="container main-content fade-in-up">
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
        <ThemeToggle />
      </div>
      <header style={{ marginBottom: "4rem", textAlign: "center", paddingTop: "2rem" }}>
        <h1 className="heading-xl">{settings?.headerTitle || "Explore. Create. Inspire."}</h1>
        <p style={{ fontSize: "1.25rem", color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto 2rem", whiteSpace: "pre-wrap" }}>
          {settings?.headerDescription || "Welcome to my personal corner of the internet. Here I share technical deep-dives and pieces of my life story."}
        </p>
      </header>

      <main>
        <DynamicPostGrid 
          initialPosts={renderPosts.map(p => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            isFeatured: p.isFeatured,
            author: { username: p.author.username, firstName: p.author.firstName },
            createdAt: p.createdAt.toISOString(),
            tags: p.tags.map(t => ({ name: t.name, slug: t.slug })),
            views: p.views,
            content: p.content
          }))} 
          navItems={navItems} 
          initialCursor={nextCursor} 
        />
      </main>

      <footer style={{ marginTop: '5rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        <p>© {new Date().getFullYear()} ExploreCMS. All rights reserved.</p>
      </footer>
      <ViewTracker />
    </div>
  );
}
