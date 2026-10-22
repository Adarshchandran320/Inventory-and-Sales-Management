export default function ErrorMessage({ message, onClose }) {
  if (!message) return null
  return (
    <div className="alert alert-danger d-flex justify-content-between" role="alert">
      <span>{message}</span>
      {onClose && (
        <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
      )}
    </div>
  )
}