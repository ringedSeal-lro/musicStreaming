import { useEffect, useId, useState, type FormEvent } from 'react'
import { api, errorText } from '../../api/client'
import type { TagDTO } from '../../api/types'
import { Modal } from '../common/Modal'
import { Icon } from '../common/Icon'

interface Props {
  title: string
  initialTags: TagDTO[]
  /** Adiciona por nome (o back-end cria a tag se não existir) e devolve as tags atualizadas. */
  add: (name: string) => Promise<TagDTO[]>
  remove: (tagId: number) => Promise<void>
  onChanged: () => void
  onClose: () => void
}

export function TagsDialog({ title, initialTags, add, remove, onChanged, onClose }: Props) {
  const [tags, setTags] = useState(initialTags)
  const [allTags, setAllTags] = useState<TagDTO[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [changed, setChanged] = useState(false)
  const listId = useId()

  useEffect(() => {
    api.tags.list().then(setAllTags, () => setAllTags([]))
  }, [])

  const close = () => {
    if (changed) onChanged()
    onClose()
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const name = input.trim()
    if (!name) return
    setBusy(true)
    setError(null)
    try {
      setTags(await add(name))
      setInput('')
      setChanged(true)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const removeTag = async (tag: TagDTO) => {
    setBusy(true)
    setError(null)
    try {
      await remove(tag.id)
      setTags((list) => list.filter((t) => t.id !== tag.id))
      setChanged(true)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const suggestions = allTags.filter((t) => !tags.some((own) => own.id === t.id))

  return (
    <Modal title={title} onClose={close} footer={<button className="btn btn--primary" onClick={close}>Concluir</button>}>
      <div className="chips chips--editable" aria-live="polite">
        {tags.length === 0 && <span className="muted">Sem tags.</span>}
        {tags.map((tag) => (
          <span key={tag.id} className="chip">
            {tag.name}
            <button type="button" aria-label={`Remover tag ${tag.name}`} onClick={() => removeTag(tag)} disabled={busy}>
              <Icon name="close" size={14} />
            </button>
          </span>
        ))}
      </div>
      <form onSubmit={submit} className="form form--inline">
        <label className="field field--grow">
          <span>Nova tag</span>
          <input
            value={input}
            maxLength={100}
            list={listId}
            placeholder="ex.: chill, estudo, treino"
            onChange={(e) => setInput(e.target.value)}
          />
          <datalist id={listId}>
            {suggestions.map((t) => (
              <option key={t.id} value={t.name} />
            ))}
          </datalist>
        </label>
        <button type="submit" className="btn btn--primary" disabled={busy || !input.trim()}>
          Adicionar
        </button>
      </form>
      <p className="muted small">As tags são salvas em minúsculas.</p>
      {error && <p className="form__error" role="alert">{error}</p>}
    </Modal>
  )
}
