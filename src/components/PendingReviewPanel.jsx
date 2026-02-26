import { useMemo, useState } from 'react'
import { formatCurrency } from '../utils/formatters'
import { getDescriptionKey } from '../utils/descriptionKey'

function buildTopDescriptions(transactions) {
  const grouped = new Map()

  transactions.forEach((transaction) => {
    const key = getDescriptionKey(transaction.descricao)
    const current = grouped.get(key) || {
      key,
      descricao: transaction.descricao,
      total: 0,
      count: 0,
    }

    current.total += Math.abs(transaction.value)
    current.count += 1
    grouped.set(key, current)
  })

  return [...grouped.values()].sort((left, right) => right.total - left.total)
}

export function PendingReviewPanel({
  transactions,
  onOpenDetails,
  overrides,
  categoryOptions,
  onSaveOverride,
  onRemoveOverride,
}) {
  const total = transactions.reduce((acc, item) => acc + Math.abs(item.value), 0)
  const topDescriptions = useMemo(() => buildTopDescriptions(transactions), [transactions])
  const [drafts, setDrafts] = useState({})

  if (transactions.length === 0) return null

  function getDraftValue(item) {
    const currentOverride = overrides[item.key] || ''
    return drafts[item.key] ?? currentOverride
  }

  function onChangeDraft(itemKey, value) {
    setDrafts((previous) => ({
      ...previous,
      [itemKey]: value,
    }))
  }

  function handleSave(item) {
    const value = getDraftValue(item)
    if (!value) return
    onSaveOverride(item.descricao, value)
  }

  function handleClear(item) {
    setDrafts((previous) => {
      const next = { ...previous }
      delete next[item.key]
      return next
    })
    onRemoveOverride(item.descricao)
  }

  return (
    <section className="panel pending-panel">
      <div className="pending-header">
        <div>
          <h2>Mesa de Classificacao</h2>
          <p className="muted">
            Ajuste manual de itens sensiveis para padronizar governanca financeira.
          </p>
        </div>
        <button type="button" className="btn btn-outline" onClick={onOpenDetails}>
          Abrir detalhes
        </button>
      </div>

      <div className="pending-metrics">
        <article>
          <span className="muted">Lancamentos pendentes</span>
          <strong>{transactions.length}</strong>
        </article>
        <article>
          <span className="muted">Valor total movimentado</span>
          <strong>{formatCurrency(total)}</strong>
        </article>
      </div>

      <ul className="pending-list">
        {topDescriptions.map((item) => (
          <li key={item.key}>
            <div className="pending-left">
              <span>{item.descricao}</span>
              <strong>
                {item.count}x - {formatCurrency(item.total)}
              </strong>
            </div>

            <div className="pending-actions">
              <select
                value={getDraftValue(item)}
                onChange={(event) => onChangeDraft(item.key, event.target.value)}
                className="pending-select"
              >
                <option value="">Escolher categoria</option>
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn-small" onClick={() => handleSave(item)}>
                Salvar
              </button>
              <button
                type="button"
                className="btn btn-outline btn-small"
                onClick={() => handleClear(item)}
              >
                Limpar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
