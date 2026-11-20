// src/pages/modules/Conferencia.tsx
// Itens, marcas, locais e filiais agora são do módulo Cadastros (/cadastros).
import { ClipboardList, BarChart3, ChartLine, LayoutTemplate, Zap } from 'lucide-react'
import PageLayout, { type TabItem } from '../PageLayouts'
import DashboardConf from './conferencia/components/DashManager'
import ConferenciaManager from './conferencia/components/ConferenciaManager'
import ModeloManager from './conferencia/components/ModeloManager'
import RelatorioManager from './conferencia/components/RelatorioManager'

import { formatarDataAtual } from '../../lib/functions'
import { formatarDataHora } from '../../lib/functions'

const tabs: TabItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: ChartLine, component: DashboardConf },
  { id: 'conferencias', label: 'Conferências', icon: ClipboardList, component: ConferenciaManager },
  { id: 'rapida', label: 'Conferência rápida', icon: Zap, component: ConferenciaManager, props: { tipo: 'rapida' } },
  { id: 'modelos', label: 'Padrões', icon: LayoutTemplate, component: ModeloManager },
  { id: 'relatorio', label: 'Relatórios', icon: BarChart3, component: RelatorioManager },
]

export default function ConferenciaPage() {
  const agora = formatarDataHora(formatarDataAtual())
  return (
    <PageLayout
      title="Conferência"
      description={`Dados atualizados em ${agora}`}
      icon={ClipboardList}
      gradient="from-rose-500 to-red-600"
      activeTabClassName="border-rose-500 text-rose-600"
      backTo="/"
      tabs={tabs}
      defaultTabId="dashboard"
    />
  )
}
