import { useApp } from '../../state/AppContext'

export function DialogHost() {
  const { dialog, closeDialog } = useApp()
  return dialog ? <>{dialog(closeDialog)}</> : null
}
