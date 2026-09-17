import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google' // 1. Importar
import { PayPalScriptProvider } from '@paypal/react-paypal-js'
import './index.css'
import './i18n/config'
import App from './App.tsx'

// Client IDs públicos (no son secretos, igual que VITE_API_URL) — vienen de
// .env/.env.production para poder tener sandbox en local y live en
// producción sin tocar código, mismo patrón que Stripe en el backend.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: 'USD', intent: 'capture' }}>
        <App />
      </PayPalScriptProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)