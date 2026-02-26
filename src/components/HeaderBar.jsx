export function HeaderBar({
  account,
  sourceLabel,
  onLogout,
  onUpload,
  onResetDefault,
  onSaveDatabase,
  themeMode,
  onToggleTheme,
}) {
  return (
    <header className="panel header-bar executive-header compact-header">
      <div className="header-title-block">
        <p className="eyebrow">CRM Financeiro</p>
        <h1>Painel Executivo</h1>
        <p className="muted">Fluxo, categorias e operacao</p>
      </div>

      <div className="header-right">
        <div className="header-meta card-like">
          <p>
            Gestor: <strong>{account?.name || account?.username || 'Usuario'}</strong>
          </p>
          <p>
            Base ativa: <strong>{sourceLabel}</strong>
          </p>
        </div>

        <div className="header-actions">
          <button type="button" className="btn btn-outline btn-compact" onClick={onToggleTheme}>
            {themeMode === 'light' ? 'Tema escuro' : 'Tema claro'}
          </button>
          <label className="btn btn-compact">
            Importar CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => onUpload?.(event.target.files?.[0])}
            />
          </label>
          <button type="button" className="btn btn-outline btn-compact" onClick={onResetDefault}>
            Banco principal
          </button>
          <button type="button" className="btn btn-outline btn-compact" onClick={onSaveDatabase}>
            Salvar banco
          </button>
          <button type="button" onClick={onLogout} className="btn btn-outline btn-compact">
            Sair
          </button>
        </div>
      </div>
    </header>
  )
}
