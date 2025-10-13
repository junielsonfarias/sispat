/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './main.css'
// import { initSentry } from './config/sentry'

// Inicializar Sentry antes de renderizar o app
// TEMPORARIAMENTE DESABILITADO - Sentry é opcional
// initSentry()

createRoot(document.getElementById('root')!).render(<App />)
