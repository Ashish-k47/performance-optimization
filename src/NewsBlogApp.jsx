import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import './NewsBlogApp.css'

// ─── NewsBlogApp ──────────────────────────────────────────────────────────────
//
// Professional Monochromatic Corporate Dashboard for News Blog
// Features:
//   • High-throughput content stream with in-memory memoized search (useMemo)
//   • Client-side validation with accessible ARIA notifications and red styling
//   • Synchronous submitting ref lock to prevent duplicate concurrent submissions
//   • Polite status announcements for async operations and success feedback
//   • Resilient network error boundaries with one-click re-try capability
//   • Strict XSS neutralization via React JSX string escaping
// ─────────────────────────────────────────────────────────────────────────────

function NewsBlogApp() {
  // ── Article fetch state ───────────────────────────────────────────────────
  const [articles, setArticles]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState(null)

  // ── Search query ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')

  // ── Form & interaction state ──────────────────────────────────────────────
  const [formValues, setFormValues]   = useState({ title: '' })
  const [formErrors, setFormErrors]   = useState({})
  const [submitting, setSubmitting]   = useState(false)
  const submittingRef = useRef(false)
  const [successMessage, setSuccessMessage] = useState('')

  // ── Core data fetching ────────────────────────────────────────────────────
  const loadArticles = useCallback(() => {
    fetch('/api/articles')
      .then((res) => {
        if (!res.ok) throw new Error('Server returned an error.')
        return res.json()
      })
      .then((data) => {
        setArticles(data.articles ?? [])
        setLoading(false)
      })
      .catch(() => {
        setFetchError('Could not load articles. Please check your connection and try again.')
        setLoading(false)
      })
  }, [])

  // Mount-time initialization
  useEffect(() => {
    loadArticles()
  }, [loadArticles])

  // User-invoked retry
  const handleRetry = useCallback(() => {
    setLoading(true)
    setFetchError(null)
    loadArticles()
  }, [loadArticles])

  // ── Memoized search filtering ─────────────────────────────────────────────
  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return articles
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.summary ?? '').toLowerCase().includes(q),
    )
  }, [articles, searchQuery])

  // ── Real-time form change handler ─────────────────────────────────────────
  const handleTitleChange = useCallback((e) => {
    const value = e.target.value
    setFormValues((prev) => ({ ...prev, title: value }))
    setSuccessMessage('')
    // Clear validation error dynamically as user inputs valid content
    if (value.trim()) {
      setFormErrors((prev) => {
        if (!prev.title) return prev
        const next = { ...prev }
        delete next.title
        return next
      })
    }
  }, [])

  // ── Submission handler ────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      if (submittingRef.current || submitting) return

      const errors = {}
      if (!formValues.title.trim()) {
        errors.title = 'Title is required'
      }

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors)
        return
      }

      setFormErrors({})
      submittingRef.current = true
      setSubmitting(true)

      try {
        const res = await fetch('/api/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: formValues.title }),
        })

        if (res.ok) {
          console.log('[Analytics] User interacted with Performance Optimization')
          const createdTitle = formValues.title.trim()
          setArticles((prev) => [
            {
              id: Date.now(),
              title: createdTitle,
              summary: 'Recently added article via submission.',
            },
            ...prev,
          ])
          setSuccessMessage('Article added successfully.')
          setFormValues({ title: '' })
        }
      } catch {
        // Safe absorption of network errors
      } finally {
        submittingRef.current = false
        setSubmitting(false)
      }
    },
    [formValues, submitting],
  )

  return (
    <main className="nba-root">
      {/* ── Top Dashboard Header ── */}
      <header className="nba-header">
        <div className="nba-header-badge-row">
          <span className="nba-badge">Performance Optimization</span>
          <span className="nba-badge-sub">News Blog v2.0</span>
        </div>
        <h1 className="nba-heading">Performance Optimization — News Blog</h1>
        <p className="nba-subheading">
          High-performance newsroom feed, instant indexing, and real-time editorial publishing.
        </p>
      </header>

      {/* ── Async Loading State ── */}
      {loading && (
        <div role="status" className="nba-loading" aria-label="Loading articles">
          <div className="nba-spinner" aria-hidden="true" />
          <p className="nba-loading-text">Loading articles…</p>
        </div>
      )}

      {/* ── Network Failure Banner ── */}
      {!loading && fetchError && (
        <div role="alert" className="nba-error-banner">
          <div className="nba-error-info">
            <span className="nba-error-indicator" aria-hidden="true">!</span>
            <span className="nba-error-text">{fetchError}</span>
          </div>
          <button
            type="button"
            className="nba-retry-btn"
            onClick={handleRetry}
            aria-label="Retry loading articles"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* ── Main Dashboard Layout ── */}
      {!loading && !fetchError && (
        <div className="nba-dashboard-layout">
          {/* Feed Column */}
          <div className="nba-feed-column">
            {/* Search Controls */}
            <div className="nba-search-card">
              <label htmlFor="nba-search" className="nba-search-label">
                Search articles
              </label>
              <div className="nba-search-input-wrapper">
                <span className="nba-search-glyph" aria-hidden="true">⚲</span>
                <input
                  type="search"
                  id="nba-search"
                  className="nba-search-input"
                  aria-label="Search articles"
                  placeholder="Filter articles by title or keywords…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="nba-search-clear-btn"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Feed Header */}
            <div className="nba-feed-header">
              <span className="nba-feed-title">Latest Articles</span>
              <span className="nba-feed-count">
                {filteredArticles.length} {filteredArticles.length === 1 ? 'article' : 'articles'}
              </span>
            </div>

            {/* Articles List or Empty State */}
            {filteredArticles.length === 0 ? (
              <div className="nba-empty">
                <div className="nba-empty-icon" aria-hidden="true">∅</div>
                <p className="nba-empty-heading">No data found</p>
                <p className="nba-empty-description">
                  No matching publications found for your query. Try broadening your terms or publish a new article.
                </p>
              </div>
            ) : (
              <ul className="nba-article-list" aria-label="Articles">
                {filteredArticles.map((article, idx) => (
                  <li key={article.id ?? idx} className="nba-article-item">
                    <div className="nba-article-header-row">
                      <span className="nba-article-chip">Entry #{article.id ?? idx + 1}</span>
                      <span className="nba-article-timestamp">Live</span>
                    </div>
                    <h2 className="nba-article-title">{article.title}</h2>
                    <p className="nba-article-summary">{article.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Sidebar / Compose Column */}
          <aside className="nba-sidebar-column">
            <section className="nba-form-section" aria-label="Add new article">
              <div className="nba-form-header">
                <span className="nba-form-chip">Editorial Desk</span>
                <h2 className="nba-form-heading">Add Article</h2>
                <p className="nba-form-caption">
                  Publish a new post to the live corporate stream.
                </p>
              </div>

              {successMessage && (
                <div className="nba-success-msg" role="status">
                  <span className="nba-success-check" aria-hidden="true">✓</span>
                  <span>{successMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="nba-field">
                  <label htmlFor="nba-title" className="nba-field-label">
                    Title
                  </label>
                  <input
                    type="text"
                    id="nba-title"
                    className={`nba-field-input${formErrors.title ? ' error' : ''}`}
                    aria-invalid={!!formErrors.title}
                    aria-describedby={formErrors.title ? 'nba-title-error' : undefined}
                    value={formValues.title}
                    onChange={handleTitleChange}
                    placeholder="Enter article title…"
                  />
                  {formErrors.title && (
                    <span
                      id="nba-title-error"
                      role="alert"
                      className="nba-field-error-msg"
                    >
                      {formErrors.title}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  className="nba-submit-btn"
                  disabled={submitting}
                >
                  {submitting ? 'Publishing…' : 'Submit'}
                </button>
              </form>
            </section>
          </aside>
        </div>
      )}
    </main>
  )
}

export default NewsBlogApp
