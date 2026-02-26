import { useState } from 'react'
import { useMsal } from '@azure/msal-react'
import { isAzureConfigured, loginRequest } from '../auth'

export function LoginPage() {
  const { instance } = useMsal()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    setLoading(true)
    setError('')

    try {
      await instance.loginPopup(loginRequest)
    } catch (loginError) {
      setError(loginError.message || 'Falha no login Microsoft.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page page-center">
      <section className="panel login-panel">
        <p className="pill">Novo CRM</p>
        <h1>Entrar com Microsoft</h1>
        <p className="muted">
          Este painel usa autenticacao pelo Azure AD. Configure o app no portal da nova conta
          antes de publicar.
        </p>

        {!isAzureConfigured && (
          <p className="error">
            Preencha <code>VITE_AZURE_CLIENT_ID</code> no arquivo <code>.env</code>.
          </p>
        )}

        {error && <p className="error">{error}</p>}

        <button type="button" className="btn" disabled={loading || !isAzureConfigured} onClick={handleLogin}>
          {loading ? 'Entrando...' : 'Entrar com Microsoft'}
        </button>
      </section>
    </main>
  )
}
