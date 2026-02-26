import { LogLevel, PublicClientApplication } from '@azure/msal-browser'

const tenantId = import.meta.env.VITE_AZURE_TENANT_ID || 'common'
const envClientId = import.meta.env.VITE_AZURE_CLIENT_ID?.trim() || ''
const placeholderClientId = '00000000-0000-0000-0000-000000000000'
const hasValidClientId = Boolean(envClientId) && envClientId !== placeholderClientId
const clientId = hasValidClientId ? envClientId : placeholderClientId
const configuredRedirectUri = import.meta.env.VITE_AZURE_REDIRECT_URI?.trim()
const isLocalDevHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
const baseRedirectUri = new URL(import.meta.env.BASE_URL || '/', window.location.origin).toString()
const redirectUri =
  import.meta.env.DEV && isLocalDevHost
    ? window.location.origin
    : configuredRedirectUri || baseRedirectUri
const scopesEnv = import.meta.env.VITE_AZURE_SCOPES

export const isAzureConfigured = hasValidClientId

export const loginRequest = {
  scopes: scopesEnv
    ? scopesEnv
        .split(',')
        .map((scope) => scope.trim())
        .filter(Boolean)
    : ['User.Read'],
}

const msalConfig = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: () => {},
      piiLoggingEnabled: false,
      logLevel: LogLevel.Error,
    },
  },
}

export const msalInstance = new PublicClientApplication(msalConfig)
