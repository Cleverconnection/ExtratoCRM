export function StatementUploader({ onUpload, onResetDefault }) {
  return (
    <section className="panel uploader control-bar">
      <div className="uploader-copy">
        <h2>Central de Arquivos</h2>
        <p className="muted">Atualize a base com CSV e reprocessamento imediato do painel.</p>
      </div>

      <div className="uploader-actions">
        <label className="btn">
          Importar CSV
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => onUpload(event.target.files?.[0])}
          />
        </label>

        <button type="button" className="btn btn-outline" onClick={onResetDefault}>
          Voltar arquivo padrao
        </button>
      </div>
    </section>
  )
}
