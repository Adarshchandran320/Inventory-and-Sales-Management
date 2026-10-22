import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ErrorMessage from '../components/ErrorMessage'
import Loading from '../components/Loading'
import StatusBadge from '../components/StatusBadge'
import { getErrorMessage } from '../services/api'
import { getPurchases } from '../services/purchaseService'
import { formatDate, money } from '../utils/format'

const statuses = ['Draft', 'Ordered', 'Received', 'Cancelled']

export default function PurchaseList() {
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getPurchases(status ? { status } : {})
      .then((data) => {
        setOrders(data)
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
        <h2 className="mb-0">Purchase Orders</h2>
        <Link to="/purchases/new" className="btn btn-primary">
          New Purchase Order
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
      ) : orders.length === 0 ? (
        <p className="text-muted">No purchase orders found.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>PO #</th>
                <th>Supplier</th>
                <th>Date</th>
                <th>Status</th>
                <th className="text-end">Total</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>{o.supplier_name}</td>
                  <td>{formatDate(o.order_date)}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="text-end">{money(o.total_amount)}</td>
                  <td className="text-end">
                    <Link to={`/purchases/${o.id}`} className="btn btn-sm btn-outline-primary">
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