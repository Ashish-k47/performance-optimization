import '@testing-library/jest-dom'

// Spy on console.log globally so tests can assert analytics calls
// without letting them pollute output. Individual tests restore when needed.
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

