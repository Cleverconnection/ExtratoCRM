import { formatCurrency } from '../utils/formatters'

export function KpiCard({ label, value, tone = 'neutral' }) {
  const resolvedValue = Number.isFinite(value) ? value : 0
  const toneMessage =
    tone === 'positive'
      ? 'Receitas consolidadas na base ativa'
      : tone === 'negative'
        ? 'Despesas consolidadas na base ativa'
        : tone === 'info'
          ? 'Saldo atual registrado na base ativa'
          : 'Resultado liquido consolidado do periodo'

  return (
    <article className={`panel kpi-card tone-${tone}`} role="status" aria-label={label}>
      <div className="kpi-flip-inner">
        <div className="kpi-face kpi-face-front">
          <p>{label}</p>
          <strong className="kpi-value">{formatCurrency(resolvedValue)}</strong>
        </div>

        <div className="kpi-face kpi-face-back" aria-hidden="true">
          <small className="kpi-back-tag">Consolidado</small>
          <strong className="kpi-value">{formatCurrency(resolvedValue)}</strong>
          <p>{toneMessage}</p>
        </div>
      </div>
    </article>
  )
}
