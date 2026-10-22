/**
 * Tests: NewsBlogApp — Performance Optimization
 *
 * Component under test: src/NewsBlogApp.jsx  (does NOT exist yet — RED phase)
 *
 * Coverage areas:
 *  1. Happy path — renders list, search filters results
 *  2. Empty state — "No data found" message
 *  3. Loading indicator — async fetch shows spinner
 *  4. Network failure — graceful error message, no crash
 *  5. Form validation — blocks submission, shows errors, red styling
 *  6. Analytics — console log on primary action
 *  7. XSS safety — script tags rendered as text, never executed
 *  8. Performance hooks — useMemo / useCallback usage (smoke test via interaction)
 *  9. Accessibility — ARIA roles, keyboard navigation, labels
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import NewsBlogApp from '../NewsBlogApp'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal article fixture — no imaginary auth / DB / business rules. */
const makeArticles = (n = 3) =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    title: `Article ${i + 1}`,
    summary: `Summary of article ${i + 1}`,
  }))

/**
 * The component fetches articles on mount.
 * We mock the global fetch so tests are offline-safe.
 */
const mockFetchSuccess = (articles = makeArticles()) => {
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => ({ articles }),
  })
}

const mockFetchFailure = () => {
  global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network Error'))
}

// ---------------------------------------------------------------------------
// 1. Happy Path
// ---------------------------------------------------------------------------

describe('NewsBlogApp — Happy Path', () => {
  beforeEach(() => {
    mockFetchSuccess()
  })

  it('renders the main heading', async () => {
    render(<NewsBlogApp />)
    // Heading must be visible (exact text flexible but accessible role required)
    const heading = await screen.findByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
  })

  it('displays fetched articles as a list', async () => {
    const articles = makeArticles(3)
    mockFetchSuccess(articles)
    render(<NewsBlogApp />)
    // Each article title must appear after loading
    for (const article of articles) {
      expect(await screen.findByText(article.title)).toBeInTheDocument()
    }
  })

  it('filters articles when search query matches', async () => {
    const articles = [
      { id: 1, title: 'React Performance Tips', summary: 'Memo and callbacks' },
      { id: 2, title: 'CSS Grid Layout', summary: 'Modern layouts' },
    ]
    mockFetchSuccess(articles)
    render(<NewsBlogApp />)

    // Wait for articles to load
    await screen.findByText('React Performance Tips')

    const searchInput = screen.getByRole('searchbox')
    await userEvent.type(searchInput, 'React')

    expect(screen.getByText('React Performance Tips')).toBeInTheDocument()
    expect(screen.queryByText('CSS Grid Layout')).not.toBeInTheDocument()
  })

  it('shows all articles when search is cleared', async () => {
    const articles = makeArticles(2)
    mockFetchSuccess(articles)
    render(<NewsBlogApp />)

    await screen.findByText('Article 1')

    const searchInput = screen.getByRole('searchbox')
    await userEvent.type(searchInput, 'Article 1')
    expect(screen.queryByText('Article 2')).not.toBeInTheDocument()

    await userEvent.clear(searchInput)
    expect(await screen.findByText('Article 2')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// 2. Empty State
// ---------------------------------------------------------------------------

describe('NewsBlogApp — Empty State', () => {
  it('shows "No data found" when fetch returns empty list', async () => {
    mockFetchSuccess([])
    render(<NewsBlogApp />)
    expect(await screen.findByText(/no data found/i)).toBeInTheDocument()
  })

  it('shows "No data found" when search has no matches', async () => {
    mockFetchSuccess(makeArticles(2))
    render(<NewsBlogApp />)

    await screen.findByText('Article 1')

    const searchInput = screen.getByRole('searchbox')
    await userEvent.type(searchInput, 'xyznotexist')

    expect(screen.getByText(/no data found/i)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// 3. Loading State
// ---------------------------------------------------------------------------

describe('NewsBlogApp — Loading Indicator', () => {
  it('shows a loading indicator while fetching articles', async () => {
    // Fetch resolves after a delay — we check before it resolves
    global.fetch = vi.fn().mockReturnValueOnce(
      new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              ok: true,
              json: async () => ({ articles: makeArticles() }),
            }),
          200,
        ),
      ),
    )

    render(<NewsBlogApp />)

    // Spinner / loading text must be present immediately
    expect(
      screen.getByRole('status') ||
        screen.getByText(/loading/i) ||
        screen.getByLabelText(/loading/i),
    ).toBeInTheDocument()

    // Eventually articles appear
    await screen.findByText('Article 1')
  })

  it('removes loading indicator after fetch completes', async () => {
    mockFetchSuccess()
    render(<NewsBlogApp />)
    await screen.findByText('Article 1')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// 4. Network Failure
// ---------------------------------------------------------------------------

describe('NewsBlogApp — Network Failure', () => {
  it('shows an error message on network failure without crashing', async () => {
    mockFetchFailure()
    render(<NewsBlogApp />)
    const errorMsg = await screen.findByRole('alert')
    expect(errorMsg).toBeInTheDocument()
    // Error message should be user-friendly, not a raw JS error stack
    expect(errorMsg.textContent).not.toMatch(/TypeError|ReferenceError|at Object/)
  })

  it('does not show the article list on network failure', async () => {
    mockFetchFailure()
    render(<NewsBlogApp />)
    await screen.findByRole('alert')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('does not show loading indicator after network failure resolves', async () => {
    mockFetchFailure()
    render(<NewsBlogApp />)
    await screen.findByRole('alert')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// 5. Form Validation
// ---------------------------------------------------------------------------

describe('NewsBlogApp — Form Validation', () => {
  beforeEach(() => {
    mockFetchSuccess()
  })

  it('blocks submission when required fields are empty', async () => {
    render(<NewsBlogApp />)
    await screen.findByText('Article 1') // wait for load

    const submitBtn = screen.getByRole('button', { name: /submit|add|post|save/i })
    await userEvent.click(submitBtn)

    // Fetch should not be called a second time for submission
    expect(global.fetch).toHaveBeenCalledTimes(1) // only the initial articles fetch
  })

  it('displays a visible error message when submission is blocked', async () => {
    render(<NewsBlogApp />)
    await screen.findByText('Article 1')

    const submitBtn = screen.getByRole('button', { name: /submit|add|post|save/i })
    await userEvent.click(submitBtn)

    // An accessible error message must appear
    const errors = screen.getAllByRole('alert')
    expect(errors.length).toBeGreaterThan(0)
  })

  it('applies red error styling class to invalid inputs', async () => {
    render(<NewsBlogApp />)
    await screen.findByText('Article 1')

    const submitBtn = screen.getByRole('button', { name: /submit|add|post|save/i })
    await userEvent.click(submitBtn)

    // At least one input must have an error class
    const inputs = document.querySelectorAll('input.error, textarea.error, [aria-invalid="true"]')
    expect(inputs.length).toBeGreaterThan(0)
  })

  it('clears validation errors when the user corrects input', async () => {
    render(<NewsBlogApp />)
    await screen.findByText('Article 1')

    const submitBtn = screen.getByRole('button', { name: /submit|add|post|save/i })
    await userEvent.click(submitBtn)

    // Error visible
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)

    // Fill the required field
    const titleInput = screen.getByLabelText(/title/i)
    await userEvent.type(titleInput, 'My new post')

    // Error for title field should clear
    await waitFor(() => {
      expect(screen.queryByText(/title.*required|required.*title/i)).not.toBeInTheDocument()
    })
  })
})

// ---------------------------------------------------------------------------
// 6. Analytics
// ---------------------------------------------------------------------------

describe('NewsBlogApp — Analytics', () => {
  beforeEach(() => {
    mockFetchSuccess()
  })

  it('logs analytics event on successful primary action', async () => {
    // Restore real console.log so we can spy on it fresh
    vi.restoreAllMocks()
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    // Set up a valid submission fetch mock
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ articles: makeArticles() }) }) // initial load
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // form submission

    render(<NewsBlogApp />)
    await screen.findByText('Article 1')

    const titleInput = screen.getByLabelText(/title/i)
    await userEvent.type(titleInput, 'Valid Title')

    const submitBtn = screen.getByRole('button', { name: /submit|add|post|save/i })
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(logSpy).toHaveBeenCalledWith(
        '[Analytics] User interacted with Performance Optimization',
      )
    })
  })
})

// ---------------------------------------------------------------------------
// 7. XSS Safety
// ---------------------------------------------------------------------------

describe('NewsBlogApp — XSS Safety', () => {
  it('renders malicious script tag in article title as plain text, not executed', async () => {
    const xssTitle = '<script>window.__XSS_FIRED__ = true</script>'
    mockFetchSuccess([{ id: 1, title: xssTitle, summary: 'safe' }])
    render(<NewsBlogApp />)

    // Wait for content to load
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    // The script must NOT have executed
    expect(window.__XSS_FIRED__).toBeUndefined()
  })

  it('does not inject dangerous HTML from user search input', async () => {
    mockFetchSuccess(makeArticles(1))
    render(<NewsBlogApp />)
    await screen.findByText('Article 1')

    const searchInput = screen.getByRole('searchbox')
    await userEvent.type(searchInput, '<img src=x onerror="window.__XSS_INPUT__=1">')

    // XSS must not fire
    expect(window.__XSS_INPUT__).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// 8. Performance Hooks (smoke test via interaction / re-render)
// ---------------------------------------------------------------------------

describe('NewsBlogApp — Performance Hooks', () => {
  it('does not crash and behaves correctly across multiple rapid searches (useMemo smoke test)', async () => {
    mockFetchSuccess(makeArticles(5))
    render(<NewsBlogApp />)
    await screen.findByText('Article 1')

    const searchInput = screen.getByRole('searchbox')

    // Type rapidly — derived state must stay consistent
    await userEvent.type(searchInput, 'Article')
    await userEvent.clear(searchInput)
    await userEvent.type(searchInput, '3')

    expect(screen.getByText('Article 3')).toBeInTheDocument()
    expect(screen.queryByText('Article 1')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// 9. Accessibility
// ---------------------------------------------------------------------------

describe('NewsBlogApp — Accessibility', () => {
  beforeEach(() => {
    mockFetchSuccess()
  })

  it('search input has an accessible label', async () => {
    render(<NewsBlogApp />)
    await screen.findByText('Article 1')
    // getByRole('searchbox') with accessible name check
    const searchInput = screen.getByRole('searchbox')
    expect(searchInput).toHaveAccessibleName()
  })

  it('article list has a list role', async () => {
    render(<NewsBlogApp />)
    await screen.findByText('Article 1')
    expect(screen.getByRole('list')).toBeInTheDocument()
  })

  it('each article list item has listitem role', async () => {
    const articles = makeArticles(3)
    mockFetchSuccess(articles)
    render(<NewsBlogApp />)
    await screen.findByText('Article 1')
    const items = screen.getAllByRole('listitem')
    expect(items.length).toBe(3)
  })

  it('submit button is keyboard-focusable and activatable', async () => {
    render(<NewsBlogApp />)
    await screen.findByText('Article 1')

    const submitBtn = screen.getByRole('button', { name: /submit|add|post|save/i })
    submitBtn.focus()
    expect(document.activeElement).toBe(submitBtn)
  })

  it('error messages are associated with their inputs via aria-describedby or role=alert', async () => {
    render(<NewsBlogApp />)
    await screen.findByText('Article 1')

    const submitBtn = screen.getByRole('button', { name: /submit|add|post|save/i })
    await userEvent.click(submitBtn)

    const alerts = screen.getAllByRole('alert')
    expect(alerts.length).toBeGreaterThan(0)
    alerts.forEach((alert) => {
      expect(alert).toBeVisible()
    })
  })

  it('loading state uses role=status for screen-reader announcement', async () => {
    global.fetch = vi.fn().mockReturnValueOnce(
      new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              ok: true,
              json: async () => ({ articles: makeArticles() }),
            }),
          200,
        ),
      ),
    )

    render(<NewsBlogApp />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    await screen.findByText('Article 1')
  })

  it('error alert has role=alert so screen readers announce it immediately', async () => {
    mockFetchFailure()
    render(<NewsBlogApp />)
    const alert = await screen.findByRole('alert')
    expect(alert).toBeInTheDocument()
  })

  it('title input has an accessible label', async () => {
    render(<NewsBlogApp />)
    await screen.findByText('Article 1')
    const titleInput = screen.getByLabelText(/title/i)
    expect(titleInput).toBeInTheDocument()
  })
})

