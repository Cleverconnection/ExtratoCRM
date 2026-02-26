import { formatCurrency, formatDate } from './formatters'

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function buildCategorySummary(transactions) {
  const totals = new Map()

  transactions.forEach((transaction) => {
    if (transaction.value >= 0) return

    const current = totals.get(transaction.category) || 0
    totals.set(transaction.category, current + Math.abs(transaction.value))
  })

  return [...totals.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((left, right) => right.total - left.total)
    .slice(0, 8)
}

function buildMonthMetrics(transactions) {
  let entradas = 0
  let saidas = 0

  transactions.forEach((transaction) => {
    if (transaction.value >= 0) entradas += transaction.value
    else saidas += Math.abs(transaction.value)
  })

  return {
    entradas,
    saidas,
    saldo: entradas - saidas,
    lancamentos: transactions.length,
  }
}

export function openMonthDetailsWindow(month) {
  const popup = window.open('', '_blank', 'width=1180,height=760,resizable=yes,scrollbars=yes')
  if (!popup) return false

  const transactions = [...month.transactions].sort((left, right) => right.date - left.date)
  const metrics = buildMonthMetrics(transactions)
  const categorySummary = buildCategorySummary(transactions)

  const rowsHtml = transactions
    .map(
      (transaction) => `
        <tr>
          <td>${escapeHtml(formatDate(transaction.date))}</td>
          <td>${escapeHtml(transaction.historico)}</td>
          <td>${escapeHtml(transaction.descricao)}</td>
          <td>${escapeHtml(transaction.category)}</td>
          <td class="${transaction.value >= 0 ? 'amount-positive' : 'amount-negative'}">${escapeHtml(
            formatCurrency(transaction.value),
          )}</td>
          <td>${escapeHtml(formatCurrency(transaction.balance))}</td>
        </tr>
      `,
    )
    .join('')

  const categoriesHtml =
    categorySummary.length === 0
      ? '<p class="empty">Sem saidas para resumir neste mes.</p>'
      : `
        <ul class="category-list">
          ${categorySummary
            .map(
              (item) => `
                <li>
                  <span>${escapeHtml(item.category)}</span>
                  <strong>${escapeHtml(formatCurrency(item.total))}</strong>
                </li>
              `,
            )
            .join('')}
        </ul>
      `

  const content = `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Detalhes do mes - ${escapeHtml(month.label)}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; background: #0f1b2a; color: #e7f2ff; }
          .wrap { padding: 18px; }
          h1, h2 { margin: 0 0 8px; }
          h1 { font-size: 22px; }
          h2 { font-size: 17px; }
          p { margin: 0 0 12px; color: #9cb3cd; }
          .panel { background: #15263a; border: 1px solid #2b3f57; border-radius: 12px; padding: 12px; margin-bottom: 12px; }
          .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
          .grid-2 { display: grid; grid-template-columns: 340px 1fr; gap: 12px; }
          .card { background: #102032; border: 1px solid #2a3f58; border-radius: 10px; padding: 10px; }
          .label { color: #9eb6d1; font-size: 12px; margin-bottom: 3px; text-transform: uppercase; }
          .value { font-size: 20px; font-weight: 700; }
          .amount-positive { color: #74e0ae; font-weight: 700; }
          .amount-negative { color: #ff8f96; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; padding: 9px; border-bottom: 1px solid #22384f; vertical-align: top; }
          th { color: #a9c5e3; font-weight: 600; }
          .table-wrap { max-height: 530px; overflow: auto; border: 1px solid #2b3f57; border-radius: 10px; }
          .category-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
          .category-list li { display: flex; justify-content: space-between; align-items: center; background: #102032; border: 1px solid #2a3f58; border-radius: 8px; padding: 8px 10px; }
          .empty { color: #9cb3cd; }
          @media (max-width: 980px) {
            .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .grid-2 { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <h1>Detalhes do mes: ${escapeHtml(month.label)}</h1>
          <p>Visao detalhada de governanca para o periodo selecionado.</p>

          <section class="panel">
            <div class="grid">
              <article class="card">
                <div class="label">Entradas</div>
                <div class="value amount-positive">${escapeHtml(formatCurrency(metrics.entradas))}</div>
              </article>
              <article class="card">
                <div class="label">Saidas</div>
                <div class="value amount-negative">${escapeHtml(formatCurrency(metrics.saidas))}</div>
              </article>
              <article class="card">
                <div class="label">Saldo liquido</div>
                <div class="value ${metrics.saldo >= 0 ? 'amount-positive' : 'amount-negative'}">${escapeHtml(
                  formatCurrency(metrics.saldo),
                )}</div>
              </article>
              <article class="card">
                <div class="label">Lancamentos</div>
                <div class="value">${metrics.lancamentos}</div>
              </article>
            </div>
          </section>

          <section class="grid-2">
            <article class="panel">
              <h2>Top categorias de saida</h2>
              ${categoriesHtml}
            </article>

            <article class="panel">
              <h2>Transacoes do mes</h2>
              ${
                transactions.length === 0
                  ? '<p class="empty">Nenhuma transacao encontrada para este mes.</p>'
                  : `
                    <div class="table-wrap">
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
                        <tbody>${rowsHtml}</tbody>
                      </table>
                    </div>
                  `
              }
            </article>
          </section>
        </div>
      </body>
    </html>
  `

  popup.document.open()
  popup.document.write(content)
  popup.document.close()
  return true
}
