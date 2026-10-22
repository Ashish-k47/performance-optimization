import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Minimal in-memory dev mock for browser preview
function devApiMockPlugin() {
  let articles = [
    {
      id: 1,
      title: 'Optimizing React Rendering Performance',
      summary: 'Practical guide to reducing unnecessary renders using useMemo and useCallback.',
    },
    {
      id: 2,
      title: 'Building Monochromatic Accessible UIs',
      summary: 'Design principles for high-contrast, clean corporate interfaces with WCAG compliance.',
    },
    {
      id: 3,
      title: 'Defensive Frontend Input Sanitization',
      summary: 'Techniques for preventing XSS and securing text input flows in single-page apps.',
    },
  ]

  return {
    name: 'dev-api-mock',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0]
        if (url === '/api/articles') {
          if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ articles }))
            return
          }
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body)
                const newArticle = {
                  id: Date.now(),
                  title: parsed.title,
                  summary: 'Recently submitted article via browser preview.',
                }
                articles = [newArticle, ...articles]
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ ok: true, article: newArticle }))
              } catch {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Invalid JSON payload' }))
              }
            })
            return
          }
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devApiMockPlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
})
