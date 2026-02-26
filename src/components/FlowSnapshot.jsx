import { useMemo, useState } from 'react'
import { formatCurrency } from '../utils/formatters'
import { openMonthDetailsWindow } from '../utils/monthDetailsWindow'

const MONTHS_PER_PAGE = 8

function monthKey(date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  return `${year}-${month}`
}

function monthLabel(key) {
  const [year, month] = key.split('-').map(Number)
  const monthNames = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ]
  return `${monthNames[month - 1]}/${year}`
}

function buildMonthlySummary(transactions) {
  const byMonth = new Map()

  transactions.forEach((transaction) => {
    const key = monthKey(transaction.date)
    const current = byMonth.get(key) || { key, entradas: 0, saidas: 0, transactions: [] }

    if (transaction.value >= 0) current.entradas += transaction.value
    else current.saidas += Math.abs(transaction.value)
    current.transactions.push(transaction)

    byMonth.set(key, current)
  })

  const months = [...byMonth.values()]
    .sort((left, right) => left.key.localeCompare(right.key))
    .reverse()
  const maxValue = Math.max(1, ...months.map((item) => Math.max(item.entradas, item.saidas)))

  return months.map((item) => ({
    ...item,
    saldo: item.entradas - item.saidas,
    label: monthLabel(item.key),
    entradaPct: (item.entradas / maxValue) * 100,
    saidaPct: (item.saidas / maxValue) * 100,
  }))
}

export function FlowSnapshot({ transactions }) {
  const [currentPage, setCurrentPage] = useState(0)
  const months = useMemo(() => buildMonthlySummary(transactions), [transactions])
  const totalPages = Math.max(1, Math.ceil(months.length / MONTHS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages - 1)
  const pageStart = safeCurrentPage * MONTHS_PER_PAGE
  const visibleMonths = months.slice(pageStart, pageStart + MONTHS_PER_PAGE)

  function goPrevious() {
    setCurrentPage((page) => Math.max(0, page - 1))
  }

  function goNext() {
    setCurrentPage((page) => Math.min(totalPages - 1, page + 1))
  }

  return (
    <section className="panel flow-panel">
      <header className="panel-head">
        <div>
          <h2>Fluxo Mensal</h2>
          <p className="muted">Leitura dinamica de entradas e saidas</p>
        </div>
      </header>

      {months.length === 0 && <p className="muted">Sem dados para analisar.</p>}

      {months.length > 0 && (
        <ul className="flow-list">
          {visibleMonths.map((month, index) => (
            <li key={month.key}>
              <button
                type="button"
                className="flow-item-button"
                onClick={() => openMonthDetailsWindow(month)}
              >
                <div className="flow-left">
                  <strong translate="no">{month.label}</strong>
                  <small className={month.saldo >= 0 ? 'amount-positive' : 'amount-negative'}>
                    Saldo {formatCurrency(month.saldo)}
                  </small>
                </div>
                <div className="flow-bars">
                  <div
                    className="flow-bar row-in"
                    style={{
                      '--bar-target': `${month.entradaPct}%`,
                      '--bar-delay': `${index * 70}ms`,
                    }}
                  />
                  <div
                    className="flow-bar row-out"
                    style={{
                      '--bar-target': `${month.saidaPct}%`,
                      '--bar-delay': `${80 + index * 70}ms`,
                    }}
                  />
                </div>
                <div className="flow-right">
                  <small className="amount-positive">{formatCurrency(month.entradas)}</small>
                  <small className="amount-negative">{formatCurrency(month.saidas)}</small>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="flow-pagination" aria-label="Paginacao de meses">
          <button
            type="button"
            className="flow-page-btn"
            onClick={goPrevious}
            disabled={safeCurrentPage === 0}
          >
            Anterior
          </button>
          <span className="flow-page-label">
            Pagina {safeCurrentPage + 1} de {totalPages}
          </span>
          <button
            type="button"
            className="flow-page-btn"
            onClick={goNext}
            disabled={safeCurrentPage === totalPages - 1}
          >
            Proximo
          </button>
        </nav>
      )}
    </section>
  )
}
