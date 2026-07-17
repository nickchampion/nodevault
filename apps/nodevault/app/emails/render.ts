import type { ReactElement } from 'react'

// Emails are served as route handlers so they stay clean static documents —
// no root layout chrome, stylesheets or Next.js hydration scripts.
// react-dom/server must be imported dynamically: Next.js rejects static imports
// of it anywhere under app/
export const emailResponse = async (email: ReactElement) => {
  const { renderToStaticMarkup } = await import('react-dom/server')

  return new Response(`<!DOCTYPE html>${renderToStaticMarkup(email)}`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
