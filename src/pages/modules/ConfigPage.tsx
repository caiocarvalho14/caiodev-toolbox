// src/pages/modules/ConfigPage.tsx
import { RefreshCw, Settings, UserRound } from 'lucide-react'
import PageLayout, { type TabItem } from '../PageLayouts'
import { PerfilConfig } from './configPage/components/PerfilConfig'
import { SincronizacaoConfig } from './configPage/components/SincronizacaoConfig'

const tabs: TabItem[] = [
  { id: 'perfil', label: 'Perfil', icon: UserRound, component: PerfilConfig },
  { id: 'sincronizacao', label: 'Sincronização', icon: RefreshCw, component: SincronizacaoConfig },
]

export default function ConfigPage() {
  return (
    <PageLayout
      title="Configurações"
      icon={Settings}
      gradient="from-rose-500 to-red-600"
      activeTabClassName="border-rose-500 text-rose-600"
      backTo="/"
      tabs={tabs}
      defaultTabId="perfil"
    />
  )
}
