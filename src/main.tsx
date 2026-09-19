// main.tsx

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// providers
import { AuthProvider } from './contexts/AuthContext.tsx'
import { RouteAccessProvider } from './contexts/RouteAccessContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouteAccessProvider>
        <App />
      </RouteAccessProvider>
    </AuthProvider>
  </StrictMode>,
)
