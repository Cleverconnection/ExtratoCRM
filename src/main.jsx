import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { EventType } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import App from './App'
import { msalInstance } from './auth'
import './index.css'

async function bootstrap() {
  await msalInstance.initialize()

  const accounts = msalInstance.getAllAccounts()
  if (accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0])
  }

  msalInstance.addEventCallback((event) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload?.account) {
      msalInstance.setActiveAccount(event.payload.account)
    }
  })

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </StrictMode>,
  )
}

bootstrap()
