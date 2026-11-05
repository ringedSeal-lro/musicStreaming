import { useState, type FormEvent } from 'react'
import { errorText } from '../../api/client'
import { Modal } from '../common/Modal'

interface Props {
  title: string
  label: string
  initial?: string
  submitLabel?: string
  onSubmit: (name: string) => Promise<void>
  onClose: () => void
}

/** Pede um nome (criar/renomear). Validação igual à do back-end: obrigatório, até 200 caracteres. */
export function NameDialog({ title, label, initial = '', submitLabel = 'Salvar', onSubmit, onClose }: Props) {
  const [name, setName] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trimmed = name.trim()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!trimmed) return setError('Informe um nome.')
    setBusy(true)
    setError(null)
    try {
      await onSubmit(trimmed)
      onClose()
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label className="field">
          <span>{label}</span>
          <input
            value={name}
            maxLength={200}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!error}
            onFocus={(e) => e.target.select()}
          />
        </label>
        {error && <p className="form__error" role="alert">{error}</p>}
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn--primary" disabled={busy || !trimmed}>
            {busy ? 'Salvando…' : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  )
}
