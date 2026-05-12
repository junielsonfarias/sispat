/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './main.css'
import { initSentry } from '@/lib/sentry'

// Inicializa Sentry (no-op se pacote não instalado ou DSN ausente).
// Não bloqueia render — dynamic import resolve em paralelo.
void initSentry()

createRoot(document.getElementById('root')!).render(<App />)
