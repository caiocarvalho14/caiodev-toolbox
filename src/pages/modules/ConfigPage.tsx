// src/pages/modules/ConfigPage.tsx
import { Settings, UserRound } from 'lucide-react'
import PageLayout, { type TabItem } from '../PageLayouts'
import { PerfilConfig } from './configPage/components/PerfilConfig'

const tabs: TabItem[] = [
  { id: 'perfil', label: 'Perfil', icon: UserRound, component: PerfilConfig },
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
