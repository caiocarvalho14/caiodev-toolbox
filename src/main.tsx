// main.tsx

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PwaUpdatePrompt from './PwaUpdatePrompt.tsx';
import './index.css'
import App from './App.tsx'

// providers
import { AuthProvider } from './contexts/AuthContext.tsx'
import { RouteAccessProvider } from './contexts/RouteAccessContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouteAccessProvider>
        <PwaUpdatePrompt/>
        <App />
      </RouteAccessProvider>
    </AuthProvider>
  </StrictMode>,
)
