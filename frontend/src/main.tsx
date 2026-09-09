import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google' // 1. Importar
import { PayPalScriptProvider } from '@paypal/react-paypal-js'
import './index.css'
import './i18n/config'
import App from './App.tsx'

// 2. Coloca aquí el Client ID real que generaste en Google Cloud
const GOOGLE_CLIENT_ID = "257526057158-5ld1epn18ov5fc4gi6s74g2d9mmukidn.apps.googleusercontent.com";

// Client ID de la app de PayPal (sandbox por ahora) — no es secreto, igual que el de Google.
const PAYPAL_CLIENT_ID = "AWkHHbQRrllIemVQuB7pqFqf0leNTillqjNiN4jt6dfPrOxyRrbiYGVEir3WNruifnfULRT9k0bBAoGk";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: 'USD', intent: 'capture' }}>
        <App />
      </PayPalScriptProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)