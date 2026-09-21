import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted variable fonts — no external CDN, works offline.
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import './index.css'

/**
 * App and store are imported dynamically so dev seeding can write localStorage
 * BEFORE the store module reads it — the store snapshots storage at import
 * time, so a static import would race it and the seed would be ignored.
 */
async function boot() {
  if (import.meta.env.DEV) {
    const { applySeedFromUrl } = await import('./dev/seed')
    applySeedFromUrl()
  }

  const { default: App } = await import('./App.tsx')

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void boot()
