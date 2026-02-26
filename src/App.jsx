import { useEffect, useState } from 'react'
import { InteractionStatus } from '@azure/msal-browser'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { isAzureConfigured } from './auth'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'

export default function App() {
  const isAuthenticated = useIsAuthenticated()
  const { inProgress, instance } = useMsal()
  const [themeMode, setThemeMode] = useState('dark')

  const account = instance.getActiveAccount() || instance.getAllAccounts()[0] || null

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode)
  }, [themeMode])

  async function handleLogout() {
    const baseRedirectUri = new URL(import.meta.env.BASE_URL || '/', window.location.origin).toString()
    await instance.logoutPopup({
      mainWindowRedirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || baseRedirectUri,
    })
  }

  function handleToggleTheme() {
    setThemeMode((mode) => (mode === 'dark' ? 'light' : 'dark'))
  }

  if (
    inProgress === InteractionStatus.Startup ||
    inProgress === InteractionStatus.HandleRedirect ||
    inProgress === InteractionStatus.Login
  ) {
    return <main className="page page-center">Inicializando autenticacao...</main>
  }

  if (!isAzureConfigured && import.meta.env.DEV) {
    return (
      <DashboardPage
        account={{ name: 'Modo Local (sem Azure)' }}
        onLogout={() => {}}
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
      />
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <DashboardPage
      account={account}
      onLogout={handleLogout}
      themeMode={themeMode}
      onToggleTheme={handleToggleTheme}
    />
  )
}
