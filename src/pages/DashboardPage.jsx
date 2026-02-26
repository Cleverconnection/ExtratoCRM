import { useEffect } from 'react'
import { CategoryList } from '../components/CategoryList'
import { BusinessPulse } from '../components/BusinessPulse'
import { FlowSnapshot } from '../components/FlowSnapshot'
import { HeaderBar } from '../components/HeaderBar'
import { KpiCard } from '../components/KpiCard'
import { PendingReviewPanel } from '../components/PendingReviewPanel'
import { TransactionTable } from '../components/TransactionTable'
import { useStatementData } from '../hooks/useStatementData'
import { isSameCategory, openCategoryDetailsWindow } from '../utils/categoryDetailsWindow'
import { formatCurrency } from '../utils/formatters'
import { isPendingCategory } from '../utils/pendingCategory'

export function DashboardPage({ account, onLogout, themeMode, onToggleTheme }) {
  const {
    data,
    loading,
    error,
    sourceLabel,
    importSummary,
    overrides,
    categoryOptions,
    loadDefaultFile,
    loadUploadedFile,
    saveManualCategory,
    clearManualCategory,
    saveCurrentDatabase,
  } = useStatementData()

  function handleCategoryClick(category) {
    const filtered = data.transactions.filter((transaction) =>
      isSameCategory(transaction.category, category),
    )
    openCategoryDetailsWindow(category, filtered)
  }

  const pendingTransactions = data.transactions.filter((transaction) =>
    isPendingCategory(transaction.category),
  )
  const totalTransactions = data.transactions.length
  const classifiedTransactions = totalTransactions - pendingTransactions.length
  const classificationCoverage =
    totalTransactions > 0 ? Math.round((classifiedTransactions / totalTransactions) * 100) : 0
  const topCategory = data.categorySummary[0]
  const totalMoved = data.totalEntradas + data.totalSaidas
  const averageEvent =
    totalTransactions > 0 ? (data.totalEntradas + data.totalSaidas) / totalTransactions : 0
  const pendingRisk = totalTransactions > 0 ? Math.round((pendingTransactions.length / totalTransactions) * 100) : 0
  const flowStatus = data.saldoLiquido >= 0 ? 'Fluxo em tracao positiva' : 'Fluxo em pressao'
  const intelCards = [
    { label: 'Volume movimentado', value: formatCurrency(totalMoved), tone: 'primary' },
    { label: 'Ticket medio por evento', value: formatCurrency(averageEvent), tone: 'secondary' },
    { label: 'Risco de pendencia', value: `${pendingRisk}%`, tone: 'warning' },
    { label: 'Status de fluxo', value: flowStatus, tone: data.saldoLiquido >= 0 ? 'success' : 'danger' },
  ]
  const heroTitle =
    'Visao consolidada da conta para decisoes rapidas do caixa.'
  const heroTitleWords = heroTitle.split(' ')

  function scrollToSection(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  useEffect(() => {
    const blocks = document.querySelectorAll('.reveal-block')
    if (!blocks.length) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.18,
        rootMargin: '0px 0px -8% 0px',
      },
    )

    blocks.forEach((block) => observer.observe(block))

    return () => observer.disconnect()
  }, [loading, error, data.transactions.length])

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const supportsFinePointer = window.matchMedia('(pointer: fine)').matches
    if (prefersReducedMotion || !supportsFinePointer) return undefined

    let rafId = 0
    let nextX = 0
    let nextY = 0

    const applyParallax = () => {
      document.documentElement.style.setProperty('--parallax-x', `${nextX.toFixed(2)}px`)
      document.documentElement.style.setProperty('--parallax-y', `${nextY.toFixed(2)}px`)
      rafId = 0
    }

    const onPointerMove = (event) => {
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      const offsetX = (event.clientX - centerX) / centerX
      const offsetY = (event.clientY - centerY) / centerY
      nextX = offsetX * 18
      nextY = offsetY * 14

      if (!rafId) rafId = requestAnimationFrame(applyParallax)
    }

    const resetParallax = () => {
      nextX = 0
      nextY = 0
      if (!rafId) rafId = requestAnimationFrame(applyParallax)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('blur', resetParallax)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('blur', resetParallax)
      if (rafId) cancelAnimationFrame(rafId)
      document.documentElement.style.setProperty('--parallax-x', '0px')
      document.documentElement.style.setProperty('--parallax-y', '0px')
    }
  }, [])

  return (
    <main className="page dashboard-page">
      <div className="reveal-block" style={{ '--reveal-delay': '40ms' }}>
        <HeaderBar
          account={account}
          sourceLabel={sourceLabel}
          onLogout={onLogout}
          onUpload={loadUploadedFile}
          onResetDefault={loadDefaultFile}
          onSaveDatabase={saveCurrentDatabase}
          themeMode={themeMode}
          onToggleTheme={onToggleTheme}
        />
      </div>

      {importSummary && !loading && !error && (
        <section className="panel reveal-block" style={{ '--reveal-delay': '70ms' }}>
          {importSummary}
        </section>
      )}

      {loading && <section className="panel">Carregando extrato...</section>}

      {error && !loading && <section className="panel error">{error}</section>}

      {!loading && !error && (
        <>
          <section className="panel cyber-hero reveal-block" style={{ '--reveal-delay': '120ms' }}>
            <div className="cyber-copy">
              <p className="eyebrow cyber-kicker">Gestao financeira</p>
              <h1 className="cyber-title" aria-label={heroTitle}>
                {heroTitleWords.map((word, index) => (
                  <span key={`${word}-${index}`} className="cyber-title-word" style={{ '--word-index': index }}>
                    {word}
                  </span>
                ))}
              </h1>
              <p className="muted">
                Painel com foco em leitura de entradas, saidas, saldo e classificacao financeira
                da base ativa.
              </p>

              <div className="cyber-badges">
                <span>{totalTransactions} lancamentos na base</span>
                <span>{classificationCoverage}% de cobertura automatica</span>
                <span>Periodo consolidado: arquivo ativo completo</span>
                <span>
                  Top categoria:{' '}
                  {topCategory ? `${topCategory.category} (${formatCurrency(topCategory.total)})` : 'n/a'}
                </span>
              </div>

              <div className="cyber-actions">
                <button type="button" className="btn" onClick={() => scrollToSection('ops-core')}>
                  Ver operacao
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => scrollToSection('classification-desk')}
                >
                  Revisar classificacao
                </button>
              </div>
            </div>

            <div className="cyber-visual" aria-hidden="true">
              <div className="cyber-grid-overlay" />
              <div className="cyber-scanline" />

              <article className="threat-core">
                <small>Saldo atual</small>
                <strong>{formatCurrency(data.saldoAtual)}</strong>
                <span>Valor mais recente registrado no extrato</span>
              </article>

              <ul className="threat-feed">
                <li>
                  <span className="pulse-dot" />
                  <p>
                    Pendencias abertas: <strong>{pendingTransactions.length}</strong>
                  </p>
                </li>
                <li>
                  <span className="pulse-dot" />
                  <p>
                    Entradas consolidadas: <strong>{formatCurrency(data.totalEntradas)}</strong>
                  </p>
                </li>
                <li>
                  <span className="pulse-dot" />
                  <p>
                    Saidas consolidadas: <strong>{formatCurrency(data.totalSaidas)}</strong>
                  </p>
                </li>
              </ul>
            </div>
          </section>

          <section className="intel-strip reveal-block" style={{ '--reveal-delay': '132ms' }}>
            {intelCards.map((item) => (
              <article key={item.label} className={`intel-card tone-${item.tone}`}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </section>

          <section className="signal-ticker reveal-block" style={{ '--reveal-delay': '138ms' }}>
            <div className="signal-track" aria-hidden="true">
              <span>Base ativa carregada</span>
              <span>Classificacao automatizada</span>
              <span>Entradas e saidas consolidadas</span>
              <span>Fluxo mensal atualizado</span>
              <span>Top entidades da conta</span>
              <span>Base ativa carregada</span>
              <span>Classificacao automatizada</span>
              <span>Entradas e saidas consolidadas</span>
              <span>Fluxo mensal atualizado</span>
              <span>Top entidades da conta</span>
            </div>
          </section>

          <div className="section-divider section-divider-a reveal-block" style={{ '--reveal-delay': '145ms' }}>
            <svg viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0,28 L180,90 L360,34 L530,95 L730,28 L900,86 L1000,56 L1000,120 L0,120 Z" />
            </svg>
          </div>

          <section className="grid-kpi reveal-block" style={{ '--reveal-delay': '160ms' }}>
            <KpiCard label="Entradas" value={data.totalEntradas} tone="positive" />
            <KpiCard label="Saidas" value={data.totalSaidas} tone="negative" />
            <KpiCard label="Saldo liquido" value={data.saldoLiquido} tone="neutral" />
            <KpiCard label="Saldo atual" value={data.saldoAtual} tone="info" />
          </section>

          <div className="section-divider section-divider-b reveal-block" style={{ '--reveal-delay': '190ms' }}>
            <svg viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0,66 L120,30 L275,88 L450,26 L620,82 L790,22 L930,70 L1000,48 L1000,120 L0,120 Z" />
            </svg>
          </div>

          <section className="ops-layout reveal-block" style={{ '--reveal-delay': '220ms' }}>
            <div id="ops-core" className="ops-main">
              <FlowSnapshot transactions={data.transactions} />
              <TransactionTable transactions={data.transactions} />
            </div>

            <aside className="ops-side">
              <BusinessPulse transactions={data.transactions} />
              <div id="classification-desk">
                <PendingReviewPanel
                  transactions={pendingTransactions}
                  overrides={overrides}
                  categoryOptions={categoryOptions}
                  onSaveOverride={saveManualCategory}
                  onRemoveOverride={clearManualCategory}
                  onOpenDetails={() =>
                    openCategoryDetailsWindow('Pendentes de Classificacao', pendingTransactions)
                  }
                />
              </div>
              <CategoryList
                categories={data.categorySummary}
                onCategoryClick={handleCategoryClick}
              />
            </aside>
          </section>
        </>
      )}
    </main>
  )
}
