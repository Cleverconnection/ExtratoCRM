import { formatCurrency, formatDate } from './formatters'
import { normalizeText } from './normalizeText'

const SOCIOS = [
  {
    name: 'Danilo Montanher',
    aliases: ['danilo montanher', 'danilo de morais montanher'],
  },
  {
    name: 'Allyson Bastos',
    aliases: ['allyson bastos'],
  },
  {
    name: 'Celso Diego',
    aliases: ['celso diego'],
  },
]

const FUNCIONARIOS = [
  {
    name: 'Andre Henrique',
    aliases: ['andre henrique'],
  },
  {
    name: 'Matheus Cardoso',
    aliases: ['matheus cardoso'],
  },
  {
    name: 'Rodrigo de Faria',
    aliases: ['rodrigo de faria', 'rodrigo faria'],
  },
  {
    name: 'Nathan De Andrade Fernandes',
    aliases: ['nathan de andrade fernandes', 'nathan de andrade', 'nathan andrade'],
  },
  {
    name: 'Marcus Assim',
    aliases: ['marcus assim', 'marcus vinicius assim', 'marcus vinicius assim januario'],
  },
  {
    name: 'Diego Ribeiro',
    aliases: ['diego ribeiro'],
  },
  {
    name: 'Jorge Henrique',
    aliases: ['jorge henrique'],
  },
  {
    name: 'Keven Alberto',
    aliases: ['keven alberto'],
  },
  {
    name: 'Sergio Oliveira',
    aliases: ['sergio oliveira'],
  },
  {
    name: 'Jonathan Emerson',
    aliases: ['jonathan emerson'],
  },
  {
    name: 'Wellington Peixoto',
    aliases: ['wellington peixoto'],
  },
  {
    name: 'Lucas Forte Cuenca',
    aliases: ['lucas forte cuenca'],
  },
]

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function isSociosCategory(category) {
  const normalized = normalizeText(category)
  return normalized === 'socios' || normalized === 'socio'
}

export function isSameCategory(leftCategory, rightCategory) {
  return normalizeText(leftCategory) === normalizeText(rightCategory)
}

function detectPersonByAlias(transaction, people) {
  const content = normalizeText(`${transaction.historico} ${transaction.descricao}`)

  for (const person of people) {
    if (person.aliases.some((alias) => content.includes(alias))) return person.name
  }

  return ''
}

function detectSocio(transaction) {
  return detectPersonByAlias(transaction, SOCIOS)
}

function detectFuncionario(transaction) {
  return detectPersonByAlias(transaction, FUNCIONARIOS)
}

function normalizeEntityName(value = '') {
  return String(value).replace(/\s+/g, ' ').trim()
}

function canonicalizeClienteName(rawName) {
  const normalized = normalizeText(rawName)

  if (normalized.includes('yara')) {
    return 'Yara Brasil Fertilizantes S A'
  }

  return normalizeEntityName(rawName)
}

function detectCliente(transaction) {
  if (normalizeText(transaction.category) !== 'clientes') return ''
  return canonicalizeClienteName(transaction.descricao)
}

function buildCategoryMetrics(transactions) {
  let entradas = 0
  let saidas = 0

  transactions.forEach((transaction) => {
    if (transaction.value >= 0) entradas += transaction.value
    else saidas += Math.abs(transaction.value)
  })

  return {
    entradas,
    saidas,
    saldoLiquido: entradas - saidas,
    lancamentos: transactions.length,
  }
}

function buildPeopleMetrics(transactions, people, detector) {
  const base = new Map(
    people.map((person) => [
      person.name,
      {
        name: person.name,
        entradas: 0,
        saidas: 0,
        saldoLiquido: 0,
        lancamentos: 0,
      },
    ]),
  )

  transactions.forEach((transaction) => {
    const personName = detector(transaction)
    if (!personName) return

    const current = base.get(personName)
    if (!current) return

    current.lancamentos += 1

    if (transaction.value >= 0) current.entradas += transaction.value
    else current.saidas += Math.abs(transaction.value)

    current.saldoLiquido = current.entradas - current.saidas
  })

  return [...base.values()]
    .filter((item) => item.lancamentos > 0)
    .sort((left, right) => Math.abs(right.saldoLiquido) - Math.abs(left.saldoLiquido))
}

function buildSociosMetrics(transactions) {
  return buildPeopleMetrics(transactions, SOCIOS, detectSocio)
}

function buildFuncionariosMetrics(transactions) {
  return buildPeopleMetrics(transactions, FUNCIONARIOS, detectFuncionario)
}

function buildClientesMetrics(transactions) {
  const grouped = new Map()

  transactions.forEach((transaction) => {
    if (normalizeText(transaction.category) !== 'clientes') return

    const clientName = detectCliente(transaction)
    if (!clientName) return

    const key = normalizeText(clientName)
    const current = grouped.get(key) || {
      name: clientName,
      entradas: 0,
      saidas: 0,
      saldoLiquido: 0,
      lancamentos: 0,
    }

    current.lancamentos += 1
    if (transaction.value >= 0) current.entradas += transaction.value
    else current.saidas += Math.abs(transaction.value)
    current.saldoLiquido = current.entradas - current.saidas

    grouped.set(key, current)
  })

  return [...grouped.values()]
    .sort(
      (left, right) =>
        right.entradas + right.saidas - (left.entradas + left.saidas),
    )
    .slice(0, 15)
}

function renderPeopleCards(metrics) {
  if (metrics.length === 0) {
    return '<p class="empty">Sem lancamentos nesta categoria.</p>'
  }

  return `
    <div class="grid-3">
      ${metrics
        .map(
          (item) => `
            <div class="card">
              <div class="label">${escapeHtml(item.name)}</div>
              <div class="meta">Entradas: <span class="amount-positive">${escapeHtml(
                formatCurrency(item.entradas),
              )}</span></div>
              <div class="meta">Saidas: <span class="amount-negative">${escapeHtml(
                formatCurrency(item.saidas),
              )}</span></div>
              <div class="meta">Saldo: <strong class="${
                item.saldoLiquido >= 0 ? 'amount-positive' : 'amount-negative'
              }">${escapeHtml(formatCurrency(item.saldoLiquido))}</strong></div>
              <div class="meta">Lancamentos: ${item.lancamentos}</div>
            </div>
          `,
        )
        .join('')}
    </div>
  `
}

export function openCategoryDetailsWindow(category, transactions) {
  const popup = window.open('', '_blank', 'width=1180,height=760,resizable=yes,scrollbars=yes')
  if (!popup) return false

  const metrics = buildCategoryMetrics(transactions)
  const sociosMetrics = buildSociosMetrics(transactions)
  const funcionariosMetrics = buildFuncionariosMetrics(transactions)
  const clientesMetrics = buildClientesMetrics(transactions)
  const isClientesView = normalizeText(category) === 'clientes' || normalizeText(category) === 'cliente'

  const rowsHtml = transactions
    .map(
      (transaction) => `
        <tr>
          <td>${escapeHtml(formatDate(transaction.date))}</td>
          <td>${escapeHtml(transaction.historico)}</td>
          <td>${escapeHtml(transaction.descricao)}</td>
          <td>${escapeHtml(detectCliente(transaction) || '-')}</td>
          <td>${escapeHtml(detectFuncionario(transaction) || '-')}</td>
          <td>${escapeHtml(detectSocio(transaction) || '-')}</td>
          <td>${escapeHtml(transaction.category)}</td>
          <td class="${transaction.value >= 0 ? 'amount-positive' : 'amount-negative'}">${escapeHtml(
            formatCurrency(transaction.value),
          )}</td>
          <td>${escapeHtml(formatCurrency(transaction.balance))}</td>
        </tr>
      `,
    )
    .join('')

  const content = `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Detalhes - ${escapeHtml(category)}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; background: #0f1824; color: #e8eef7; }
          .wrap { padding: 20px; }
          h1, h2 { margin: 0 0 8px; }
          h1 { font-size: 22px; }
          h2 { font-size: 17px; }
          p { margin: 0 0 14px; color: #96a9c2; }
          .panel { background: #182434; border: 1px solid #2a394f; border-radius: 12px; padding: 14px; }
          .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
          .grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
          .card { background: #121e2b; border: 1px solid #26374c; border-radius: 10px; padding: 10px; }
          .label { color: #9eb2ca; font-size: 13px; margin-bottom: 4px; }
          .value { font-size: 21px; font-weight: 700; }
          .meta { margin-top: 4px; font-size: 12px; color: #8ea4bf; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; padding: 10px; border-bottom: 1px solid #24354a; vertical-align: top; }
          th { color: #9eb2ca; font-weight: 600; }
          .amount-positive { color: #7de9b4; font-weight: 600; }
          .amount-negative { color: #f58f8f; font-weight: 600; }
          .empty { color: #96a9c2; }
          .section { margin-bottom: 12px; }
          @media (max-width: 960px) {
            .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .grid-3 { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <h1>Detalhes da categoria: ${escapeHtml(category)}</h1>
          <p>Visao analitica para governanca financeira.</p>

          <div class="panel section">
            <h2>Dash da categoria</h2>
            <div class="grid">
              <div class="card">
                <div class="label">Entradas</div>
                <div class="value amount-positive">${escapeHtml(formatCurrency(metrics.entradas))}</div>
              </div>
              <div class="card">
                <div class="label">Saidas</div>
                <div class="value amount-negative">${escapeHtml(formatCurrency(metrics.saidas))}</div>
              </div>
              <div class="card">
                <div class="label">Saldo liquido</div>
                <div class="value ${metrics.saldoLiquido >= 0 ? 'amount-positive' : 'amount-negative'}">${escapeHtml(
                  formatCurrency(metrics.saldoLiquido),
                )}</div>
              </div>
              <div class="card">
                <div class="label">Lancamentos</div>
                <div class="value">${metrics.lancamentos}</div>
              </div>
            </div>
          </div>

          ${
            sociosMetrics.length > 0
              ? `
                <div class="panel section">
                  <h2>Governanca por socios</h2>
                  ${renderPeopleCards(sociosMetrics)}
                </div>
              `
              : ''
          }

          ${
            funcionariosMetrics.length > 0
              ? `
                <div class="panel section">
                  <h2>Governanca por funcionarios</h2>
                  ${renderPeopleCards(funcionariosMetrics)}
                </div>
              `
              : ''
          }

          ${
            isClientesView
              ? `
                <div class="panel section">
                  <h2>Governanca por clientes</h2>
                  ${renderPeopleCards(clientesMetrics)}
                </div>
              `
              : ''
          }

          <div class="panel">
            ${
              transactions.length === 0
                ? '<p class="empty">Nenhum lancamento encontrado para esta categoria.</p>'
                : `
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Historico</th>
                        <th>Descricao</th>
                        <th>Cliente</th>
                        <th>Funcionario</th>
                        <th>Socio</th>
                        <th>Categoria</th>
                        <th>Valor</th>
                        <th>Saldo</th>
                      </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                  </table>
                `
            }
          </div>
        </div>
      </body>
    </html>
  `

  popup.document.open()
  popup.document.write(content)
  popup.document.close()
  return true
}
