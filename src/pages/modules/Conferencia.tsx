// src/pages/ConferenciaPage.tsx (ou onde você monta a página do módulo)
import { Tag, ClipboardList, Package, MapPin } from 'lucide-react'
import PageLayout, { type TabItem } from '../PageLayouts'
import MarcaManager from '../modules/conferencia/components/MarcaManager'
// ainda não criados: ItemManager, LocalManager, RegistroManager

const tabs: TabItem[] = [
  { id: 'marcas', label: 'Marcas', icon: Tag, component: MarcaManager },
  // { id: 'conferencias', label: 'Conferências', icon: ClipboardList, component: ConferenciaManager },
  // { id: 'itens', label: 'Itens', icon: Package, component: ItemManager },
  // { id: 'locais', label: 'Locais', icon: MapPin, component: LocalManager },
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
      defaultTabId="marcas"
    />
  )
}