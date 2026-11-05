import { useEffect, useState } from 'react'
import { api, errorText } from '../../api/client'
import type { LibraryDTO, SyncOperationDTO, SyncOperationType, SyncResultDTO } from '../../api/types'
import { Modal } from '../common/Modal'
import { Loading } from '../common/StateViews'

interface Props {
  library: LibraryDTO
  onDone: () => Promise<void>
  onClose: () => void
}

type Phase =
  | { step: 'planning' }
  | { step: 'plan'; plan: SyncResultDTO }
  | { step: 'running' }
  | { step: 'done'; result: SyncResultDTO }
  | { step: 'error'; message: string }

const LABELS: Record<SyncOperationType, string> = {
  MKDIR: 'pastas criadas',
  MOVE: 'arquivos movidos',
  LINK: 'cópias criadas',
  RMDIR: 'pastas vazias removidas',
}

/** 1) dryRun para mostrar o plano, 2) confirmação, 3) sync de verdade e resultado. */
export function SyncDialog({ library, onDone, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>({ step: 'planning' })

  useEffect(() => {
    api.libraries.sync(library.id, true).then(
      (plan) => setPhase({ step: 'plan', plan }),
      (e) => setPhase({ step: 'error', message: errorText(e) }),
    )
  }, [library.id])

  const run = async () => {
    setPhase({ step: 'running' })
    try {
      const result = await api.libraries.sync(library.id, false)
      setPhase({ step: 'done', result })
      await onDone()
    } catch (e) {
      setPhase({ step: 'error', message: errorText(e) })
    }
  }

  const running = phase.step === 'running'
  const footer =
    phase.step === 'plan' && phase.plan.operations.length > 0 ? (
      <>
        <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn--primary" onClick={run}>Sincronizar agora</button>
      </>
    ) : running ? undefined : (
      <button className="btn btn--primary" onClick={onClose}>Fechar</button>
    )

  return (
    <Modal title={`Sincronizar "${library.name}"`} onClose={onClose} locked={running} footer={footer} wide>
      {phase.step === 'planning' && <Loading label="Calculando o que vai mudar no disco…" />}

      {phase.step === 'plan' &&
        (phase.plan.operations.length === 0 ? (
          <p className="modal__text">A pasta já está igual a esta biblioteca. Nada a fazer.</p>
        ) : (
          <>
            <p className="modal__text">
              A pasta original vai ficar igual a esta biblioteca: cada playlist vira uma pasta. Nenhum arquivo é
              apagado — cópias que sobrarem vão para <code>.musicstreaming/duplicates</code>.
            </p>
            <Summary operations={phase.plan.operations} />
            <OperationList operations={phase.plan.operations} />
          </>
        ))}

      {running && <Loading label="Sincronizando arquivos… não feche esta janela." />}

      {phase.step === 'done' && (
        <>
          {phase.result.error ? (
            <p className="form__error" role="alert">
              O sync parou no meio ({phase.result.applied} de {phase.result.operations.length} operações aplicadas):{' '}
              {phase.result.error}
            </p>
          ) : (
            <p className="modal__text success">
              Pronto! {phase.result.applied} de {phase.result.operations.length} operações aplicadas.
            </p>
          )}
          <Summary operations={phase.result.operations.slice(0, phase.result.applied)} />
        </>
      )}

      {phase.step === 'error' && (
        <p className="form__error" role="alert">
          {phase.message}
        </p>
      )}
    </Modal>
  )
}

function Summary({ operations }: { operations: SyncOperationDTO[] }) {
  const counts = operations.reduce<Partial<Record<SyncOperationType, number>>>((acc, op) => {
    acc[op.type] = (acc[op.type] ?? 0) + 1
    return acc
  }, {})
  return (
    <ul className="sync-summary">
      {(Object.keys(LABELS) as SyncOperationType[]).map((type) => (
        <li key={type}>
          <strong>{counts[type] ?? 0}</strong> {LABELS[type]}
        </li>
      ))}
    </ul>
  )
}

function OperationList({ operations }: { operations: SyncOperationDTO[] }) {
  const shown = operations.slice(0, 200)
  return (
    <details className="sync-ops">
      <summary>Ver operações ({operations.length})</summary>
      <ol>
        {shown.map((op, i) => (
          <li key={i}>
            <span className={`op op--${op.type.toLowerCase()}`}>{op.type}</span>{' '}
            {op.source ? (
              <>
                <code>{op.source || '/'}</code> → <code>{op.target || '/'}</code>
              </>
            ) : (
              <code>{op.target || '/'}</code>
            )}
          </li>
        ))}
      </ol>
      {operations.length > shown.length && <p className="muted small">… e mais {operations.length - shown.length}.</p>}
    </details>
  )
}
