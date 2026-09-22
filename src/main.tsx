import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted variable fonts — no Google Fonts CDN, works offline.
// Inter covers --font-heading/--font-body; JetBrains Mono is the station face.
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
