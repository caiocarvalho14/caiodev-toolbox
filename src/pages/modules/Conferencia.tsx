// src/pages/ConferenciaPage.tsx (ou onde você monta a página do módulo)
import { Tag, ClipboardList, MapPin, Package , BarChart3 , ChartLine } from 'lucide-react'
import PageLayout, { type TabItem } from '../PageLayouts'
import DashboardConf from './conferencia/components/DashManager'
import MarcaManager from './conferencia/components/MarcaManager'
import LocalManager from './conferencia/components/LocalManagers'
import ItemManager from './conferencia/components/ItemManager'
import ConferenciaManager from './conferencia/components/ConferenciaManager'
import RelatorioManager from './conferencia/components/RelatorioManager'


const tabs: TabItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: ChartLine, component: DashboardConf},
  { id: 'conferencias', label: 'Conferências', icon: ClipboardList, component: ConferenciaManager },
  { id: 'itens', label: 'Itens', icon: Package, component: ItemManager },
  { id: 'marcas', label: 'Marcas', icon: Tag, component: MarcaManager },
  { id: 'locais', label: 'Locais', icon: MapPin, component: LocalManager },
  { id: 'relatorio', label: 'Relatórios', icon: BarChart3, component: RelatorioManager },
]

export default function ConferenciaPage() {
  return (
    <PageLayout
      title="Conferência"
      description="Controle de contagem e divergência de estoque"
      icon={ClipboardList}
      gradient="from-rose-500 to-red-600"
      activeTabClassName="border-rose-500 text-rose-600"
      backTo="/"
      tabs={tabs}
      defaultTabId="dashboard"
    />
  )
}