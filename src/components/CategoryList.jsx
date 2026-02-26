import { formatCurrency } from '../utils/formatters'

export function CategoryList({ categories, onCategoryClick }) {
  const total = categories.reduce((acc, item) => acc + item.total, 0)

  return (
    <section className="panel category-panel">
      <header className="panel-head">
        <div>
          <h2>Mapa de Categorias</h2>
          <p className="muted">Distribuicao de saidas por categoria</p>
        </div>
      </header>

      {categories.length === 0 && <p className="muted">Sem dados para exibir.</p>}

      {categories.length > 0 && (
        <ul className="category-list">
          {categories.map((item, index) => (
            <li key={item.category} className="category-list-clickable">
              <button
                type="button"
                className="category-list-button"
                onClick={() => onCategoryClick?.(item.category)}
              >
                <span className="category-name">{item.category}</span>
                <strong className="category-value">{formatCurrency(item.total)}</strong>
              </button>

              <div className="category-list-progress">
                <div
                  className="category-list-progress-bar"
                  style={{
                    '--bar-target': `${Math.max(3, total > 0 ? (item.total / total) * 100 : 0)}%`,
                    '--bar-delay': `${index * 45}ms`,
                  }}
                />
              </div>

              <p className="category-list-hint">
                {total > 0 ? `${((item.total / total) * 100).toFixed(1)}%` : '0%'} do total
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
