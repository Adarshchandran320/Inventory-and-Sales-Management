import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ErrorMessage from '../components/ErrorMessage'
import Loading from '../components/Loading'
import StatusBadge from '../components/StatusBadge'
import { getErrorMessage } from '../services/api'
import { getSales } from '../services/saleService'
import { formatDate, money } from '../utils/format'

const statuses = ['Confirmed', 'Cancelled']

export default function SaleList() {
  const [sales, setSales] = useState([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getSales(status ? { status } : {})
      .then((data) => {
        setSales(data)
        setError('')
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [status])

  const handleStatusChange = (e) => {
    setLoading(true)
    setStatus(e.target.value)
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Sales</h2>
        <Link to="/sales/new" className="btn btn-primary">
          New Sale
        </Link>
      </div>

      <div className="mb-3" style={{ maxWidth: 220 }}>
        <select className="form-select" value={status} onChange={handleStatusChange}>
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <ErrorMessage message={error} onClose={() => setError('')} />

      {loading ? (
        <Loading />
      ) : sales.length === 0 ? (
        <p className="text-muted">No sales found.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Sale #</th>
                <th>Date</th>
                <th>Status</th>
                <th className="text-end">Items</th>
                <th className="text-end">Total</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id}>
                  <td>#{s.id}</td>
                  <td>{formatDate(s.sale_date)}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td className="text-end">{s.items.length}</td>
                  <td className="text-end">{money(s.total_amount)}</td>
                  <td className="text-end">
                    <Link to={`/sales/${s.id}`} className="btn btn-sm btn-outline-primary">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}