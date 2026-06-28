const fs = require('fs');

const file = 'src/components/DynamicPostGrid.tsx';
let code = fs.readFileSync(file, 'utf8');

// Fix the hooks error by putting the useMemo unconditionally at the top level
const search = `  // Pagination State
  const [cursor, setCursor] = useState<string | undefined>(initialCursor)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(!!initialCursor)

  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const fetchNextPage = useCallback(async () => {
    if (loading || !hasMore || !cursor) return
    setLoading(true)

    try {
      const res = await fetch(\`/api/posts?cursor=\${cursor}\`)
      const data = await res.json()

      if (data.posts && data.posts.length > 0) {
        setPosts(prev => [...prev, ...data.posts])
        setCursor(data.nextCursor)
        if (!data.nextCursor) setHasMore(false)
      } else {
        setHasMore(false)
      }
    } catch (err) {
      console.error("Failed to load more posts:", err)
    } finally {
      setLoading(false)
    }
  }, [cursor, loading, hasMore])

  useEffect(() => {
    if (!hasMore) return

    const currentTarget = loadMoreRef.current
    if (currentTarget) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            fetchNextPage()
          }
        },
        { rootMargin: '200px' }
      )
      observerRef.current.observe(currentTarget)
    }

    return () => {
      if (observerRef.current && currentTarget) {
        observerRef.current.unobserve(currentTarget)
      }
    }
  }, [fetchNextPage, hasMore])

  // ⚡ Bolt: Memoize post processing and filtering
  const processedFilteredPosts = useMemo(() => {`;

const replace = `  // ⚡ Bolt: Memoize post processing and filtering
  const processedFilteredPosts = useMemo(() => {
    return posts
      .filter(post => {
        if (activeFilter.type === 'latest') return true;
        if (activeFilter.type === 'featured') return post.isFeatured;
        if (activeFilter.type === 'tag' && activeFilter.target) {
          return post.tags.some(t => t.slug === activeFilter.target);
        }
        return true;
      })
      .map(post => {
        const contentFormat = (post as any).contentFormat
        return {
          ...post,
          coverImage: post.coverImage !== undefined ? post.coverImage : (post.content ? getFirstImage(post.content, contentFormat) : null),
          excerpt: post.excerpt !== undefined ? post.excerpt : (post.content ? getExcerpt(post.content, contentFormat, 120) : '')
        }
      });
  }, [posts, activeFilter]);

  // Pagination State
  const [cursor, setCursor] = useState<string | undefined>(initialCursor)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(!!initialCursor)

  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const fetchNextPage = useCallback(async () => {
    if (loading || !hasMore || !cursor) return
    setLoading(true)

    try {
      const res = await fetch(\`/api/posts?cursor=\${cursor}\`)
      const data = await res.json()

      if (data.posts && data.posts.length > 0) {
        setPosts(prev => [...prev, ...data.posts])
        setCursor(data.nextCursor)
        if (!data.nextCursor) setHasMore(false)
      } else {
        setHasMore(false)
      }
    } catch (err) {
      console.error("Failed to load more posts:", err)
    } finally {
      setLoading(false)
    }
  }, [cursor, loading, hasMore])

  useEffect(() => {
    if (!hasMore) return

    const currentTarget = loadMoreRef.current
    if (currentTarget) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            fetchNextPage()
          }
        },
        { rootMargin: '200px' }
      )
      observerRef.current.observe(currentTarget)
    }

    return () => {
      if (observerRef.current && currentTarget) {
        observerRef.current.unobserve(currentTarget)
      }
    }
  }, [fetchNextPage, hasMore])

  const dummy = () => {`;

code = code.replace(search, replace);

// Fix trailing logic where I replaced a bit too much
const search3 = `  const dummy = () => {
    return posts
      .filter(post => {
        if (activeFilter.type === 'latest') return true;
        if (activeFilter.type === 'featured') return post.isFeatured;
        if (activeFilter.type === 'tag' && activeFilter.target) {
          return post.tags.some(t => t.slug === activeFilter.target);
        }
        return true;
      })
      .map(post => {
        const contentFormat = (post as any).contentFormat
        return {
          ...post,
          coverImage: post.coverImage !== undefined ? post.coverImage : (post.content ? getFirstImage(post.content, contentFormat) : null),
          excerpt: post.excerpt !== undefined ? post.excerpt : (post.content ? getExcerpt(post.content, contentFormat, 120) : '')
        }
      });
  }, [posts, activeFilter]);`;

code = code.replace(search3, ``);

fs.writeFileSync(file, code);
console.log('Done');
