import { useMemo, useState } from 'react'
import { formatCurrency, formatDate } from '../utils/formatters'

const PAGE_SIZE = 20

function amountClass(value) {
  return value >= 0 ? 'amount-positive' : 'amount-negative'
}

export function TransactionTable({ transactions }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageMotion, setPageMotion] = useState('next')

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE
  const endIndex = Math.min(startIndex + PAGE_SIZE, transactions.length)

  const paginatedTransactions = useMemo(
    () => transactions.slice(startIndex, startIndex + PAGE_SIZE),
    [startIndex, transactions],
  )

  function changePage(page) {
    if (page < 1 || page > totalPages) return
    if (page === safeCurrentPage) return
    setPageMotion(page > safeCurrentPage ? 'next' : 'prev')
    setCurrentPage(page)
  }

  return (
    <section className="panel table-panel">
      <div className="table-header">
        <h2>Livro de Transacoes</h2>
        <p className="muted">
          Mostrando {transactions.length === 0 ? 0 : startIndex + 1}-{endIndex} de{' '}
          {transactions.length}
        </p>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Historico</th>
              <th>Descricao</th>
              <th>Categoria</th>
              <th>Valor</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody key={`${safeCurrentPage}-${pageMotion}`} className={`table-page-motion ${pageMotion}`}>
            {paginatedTransactions.map((transaction, index) => (
              <tr key={transaction.id} style={{ '--row-index': index }}>
                <td>{formatDate(transaction.date)}</td>
                <td>{transaction.historico}</td>
                <td>{transaction.descricao}</td>
                <td>{transaction.category}</td>
                <td className={amountClass(transaction.value)}>{formatCurrency(transaction.value)}</td>
                <td>{formatCurrency(transaction.balance)}</td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  Nenhuma transacao encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="pagination" aria-label="Paginacao de transacoes">
          <button
            type="button"
            className="page-btn"
            onClick={() => changePage(safeCurrentPage - 1)}
          >
            Anterior
          </button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
            <button
              key={page}
              type="button"
              className={`page-btn ${page === safeCurrentPage ? 'active' : ''}`}
              onClick={() => changePage(page)}
            >
              {page}
            </button>
          ))}
          <button
            type="button"
            className="page-btn"
            onClick={() => changePage(safeCurrentPage + 1)}
          >
            Proxima
          </button>
        </nav>
      )}
    </section>
  )
}
