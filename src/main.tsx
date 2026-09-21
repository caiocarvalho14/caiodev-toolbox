// main.tsx

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PwaUpdatePrompt from './PwaUpdatePrompt.tsx';
import './index.css'
import App from './App.tsx'

// providers
import { AuthProvider } from './contexts/AuthContext.tsx'
import { RouteAccessProvider } from './contexts/RouteAccessContext.tsx'
import { CargoProvider } from './contexts/CargoContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouteAccessProvider>
        <CargoProvider>
          <PwaUpdatePrompt />
          <App />
        </CargoProvider>
      </RouteAccessProvider>
    </AuthProvider>
  </StrictMode>,
)
