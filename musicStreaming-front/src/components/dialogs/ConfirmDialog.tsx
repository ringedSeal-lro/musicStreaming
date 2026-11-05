import { useState, type ReactNode } from 'react'
import { errorText } from '../../api/client'
import { Modal } from '../common/Modal'

interface Props {
  title: string
  message: ReactNode
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => Promise<void>
  onClose: () => void
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirmar', danger, onConfirm, onClose }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirm = async () => {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={confirm} disabled={busy}>
            {busy ? 'Aguarde…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="modal__text">{message}</div>
      {error && <p className="form__error" role="alert">{error}</p>}
    </Modal>
  )
}
