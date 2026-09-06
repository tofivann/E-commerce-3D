import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google' // 1. Importar
import './index.css'
import './i18n/config'
import App from './App.tsx'

// 2. Coloca aquí el Client ID real que generaste en Google Cloud
const GOOGLE_CLIENT_ID = "804949758257-anogkl9md01dgghuiqlmlqvmtf39mdbh.apps.googleusercontent.com";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)