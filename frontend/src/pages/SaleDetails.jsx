import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ConfirmDelete from '../components/ConfirmDelete'
import ErrorMessage from '../components/ErrorMessage'
import Loading from '../components/Loading'
import StatusBadge from '../components/StatusBadge'
import { getErrorMessage } from '../services/api'
import { cancelSale, getSale } from '../services/saleService'
import { formatDate, money } from '../utils/format'

export default function SaleDetails() {
  const { id } = useParams()
  const [sale, setSale] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    return getSale(id)
      .then(setSale)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const handleCancel = async () => {
    setConfirming(false)
    setBusy(true)
    setError('')
    setNotice('')
    try {
      setSale(await cancelSale(id))
      setNotice('Sale cancelled. Stock has been restored.')
    } catch (e) {
      setError(getErrorMessage(e))
      await load() // the page was stale: show the real current status
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loading />
  if (!sale) return <ErrorMessage message={error || 'Sale not found.'} />

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">
          Sale #{sale.id} <StatusBadge status={sale.status} />
        </h2>
        <Link to="/sales" className="btn btn-outline-secondary">
          Back to list
        </Link>
      </div>

      <ErrorMessage message={error} onClose={() => setError('')} />
      {notice && (
        <div className="alert alert-success d-flex justify-content-between">
          <span>{notice}</span>
          <button className="btn-close" onClick={() => setNotice('')} />
        </div>
      )}

      <div className="card mb-4">
        <div className="card-body row">
          <div className="col-md-6">
            <div className="text-muted small">Sale date</div>
            <div>{formatDate(sale.sale_date)}</div>
          </div>
          <div className="col-md-6">
            <div className="text-muted small">Cancelled</div>
            <div>{sale.cancelled_at ? formatDate(sale.cancelled_at) : '-'}</div>
          </div>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table align-middle">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th className="text-end">Quantity</th>
              <th className="text-end">Unit price</th>
              <th className="text-end">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((i) => (
              <tr key={i.id}>
                <td>{i.sku}</td>
                <td>{i.product_name}</td>
                <td className="text-end">{i.quantity}</td>
                <td className="text-end">{money(i.unit_price)}</td>
                <td className="text-end">{money(i.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan="4" className="text-end">Total</th>
              <th className="text-end">{money(sale.total_amount)}</th>
            </tr>
          </tfoot>
        </table>
      </div>

      {sale.status === 'Confirmed' && (
        <button className="btn btn-outline-danger" disabled={busy}
          onClick={() => setConfirming(true)}>
          Cancel Sale
        </button>
      )}

      <ConfirmDelete
        show={confirming}
        title="Cancel this sale?"
        message="Stock for every item will be restored. This can only be done once."
        confirmLabel="Cancel sale"
        onConfirm={handleCancel}
        onCancel={() => setConfirming(false)}
      />
    </>
  )
}