import { useMemo } from 'react'
import { formatCurrency } from '../utils/formatters'
import { normalizeText } from '../utils/normalizeText'

function entityKey(description) {
  return normalizeText(description)
}

function normalizeEntityName(description) {
  return description.replace(/\s+/g, ' ').trim()
}

function canonicalizeEntityName(description) {
  const normalized = normalizeText(description)

  if (normalized.includes('yara')) {
    return 'Yara Brasil Fertilizantes S A'
  }

  return normalizeEntityName(description)
}

function buildPulse(transactions) {
  const inputs = new Map()
  const outputs = new Map()

  transactions.forEach((transaction) => {
    const canonicalName = canonicalizeEntityName(transaction.descricao)
    const key = entityKey(canonicalName)
    const bucket = transaction.value >= 0 ? inputs : outputs
    const current = bucket.get(key) || {
      name: canonicalName,
      total: 0,
      count: 0,
    }

    current.total += Math.abs(transaction.value)
    current.count += 1
    bucket.set(key, current)
  })

  const topIn = [...inputs.values()].sort((a, b) => b.total - a.total).slice(0, 5)
  const topOut = [...outputs.values()].sort((a, b) => b.total - a.total).slice(0, 5)

  return { topIn, topOut }
}

function PulseList({ title, items, tone }) {
  return (
    <article className="pulse-card">
      <h3>{title}</h3>
      {items.length === 0 && <p className="muted">Sem dados.</p>}

      {items.length > 0 && (
        <ul>
          {items.map((item) => (
            <li key={`${title}-${item.name}`}>
              <span>{item.name}</span>
              <strong className={tone}>
                {formatCurrency(item.total)} <small>({item.count}x)</small>
              </strong>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

export function BusinessPulse({ transactions }) {
  const { topIn, topOut } = useMemo(() => buildPulse(transactions), [transactions])

  return (
    <section className="panel pulse-panel">
      <header className="panel-head">
        <div>
          <h2>Pulse de Negocios</h2>
          <p className="muted">Maiores movimentacoes por entidade</p>
        </div>
      </header>

      <div className="pulse-grid">
        <PulseList title="Top Entradas" items={topIn} tone="amount-positive" />
        <PulseList title="Top Saidas" items={topOut} tone="amount-negative" />
      </div>
    </section>
  )
}
