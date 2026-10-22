import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ErrorMessage from '../components/ErrorMessage'
import Loading from '../components/Loading'
import StatusBadge from '../components/StatusBadge'
import { getErrorMessage } from '../services/api'
import { getDashboard } from '../services/dashboardService'
import { formatDate, money } from '../utils/format'
import BestSellersChart from '../components/BestSellersChart'

function StatCard({ label, value, to, variant = 'primary' }) {
  const card = (
    <div className={`card border-${variant} h-100`}>
      <div className="card-body">
        <div className="text-muted small">{label}</div>
        <div className="fs-3 fw-bold">{value}</div>
      </div>
    </div>
  )
  return to ? (
    <Link to={to} className="text-decoration-none text-reset">
      {card}
    </Link>
  ) : (
    card
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    return getDashboard()
      .then((d) => {
        setData(d)
        setError('')
      })
      .catch((e) => setError(getErrorMessage(e)))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (error && !data) return <ErrorMessage message={error} />
  if (!data) return <Loading />

  const lowStock = data.low_stock_count

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Dashboard</h2>
        <button className="btn btn-outline-secondary btn-sm" onClick={load}>
          Refresh
        </button>
      </div>

      <ErrorMessage message={error} onClose={() => setError('')} />

      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <StatCard label="Active products" value={data.total_active_products}
            to="/products?active=true" />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard label="Suppliers" value={data.total_suppliers} to="/suppliers"
            variant="secondary" />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard label="Today's revenue" value={money(data.today_revenue)}
            to="/sales" variant="success" />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard label="Low stock items" value={lowStock}
            to="/products?low_stock=true&active=true"
            variant={lowStock > 0 ? 'warning' : 'success'} />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <h5>Recent sales</h5>
          {data.recent_sales.length === 0 ? (
            <p className="text-muted">No sales yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Sale</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="text-end">Items</th>
                    <th className="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_sales.map((s) => (
                    <tr key={s.id}>
                      <td><Link to={`/sales/${s.id}`}>#{s.id}</Link></td>
                      <td>{formatDate(s.sale_date)}</td>
                      <td><StatusBadge status={s.status} /></td>
                      <td className="text-end">{s.item_count}</td>
                      <td className="text-end">{money(s.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="col-lg-5">
          <h5>Best-selling products</h5>
          {data.best_selling_products.length === 0 ? (
            <p className="text-muted">No sales data yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="text-end">Sold</th>
                    <th className="text-end">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.best_selling_products.map((p) => (
                    <tr key={p.product_id}>
                      <td>
                        {p.product_name}
                        <div className="text-muted small">{p.sku}</div>
                      </td>
                      <td className="text-end">{p.total_sold}</td>
                      <td className="text-end">{money(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
          {data.best_selling_products.length > 0 && (
        <div className="mt-4">
          <h5>Units sold by product</h5>
          <BestSellersChart data={data.best_selling_products} />
        </div>
      )}
    </>
  )
}