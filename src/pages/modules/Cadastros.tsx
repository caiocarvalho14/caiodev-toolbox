// src/pages/modules/Cadastros.tsx
// Módulo de cadastros base: dados compartilhados pelos outros módulos (ex.: Conferência).
import { Building2, Database, MapPin, Package, Tag } from 'lucide-react'
import PageLayout, { type TabItem } from '../PageLayouts'
import ItemManager from './cadastros/components/ItemManager'
import MarcaManager from './cadastros/components/MarcaManager'
import LocalManager from './cadastros/components/LocalManager'
import FilialManager from './cadastros/components/FilialManager'

const tabs: TabItem[] = [
  { id: 'itens', label: 'Itens', icon: Package, component: ItemManager },
  { id: 'marcas', label: 'Marcas', icon: Tag, component: MarcaManager },
  { id: 'locais', label: 'Locais', icon: MapPin, component: LocalManager },
  { id: 'filiais', label: 'Filiais', icon: Building2, component: FilialManager },
]

export default function CadastrosPage() {
  return (
    <PageLayout
      title="Cadastros"
      description="Itens, marcas, locais e filiais usados pelos outros módulos"
      icon={Database}
      gradient="from-sky-500 to-indigo-600"
      activeTabClassName="border-sky-500 text-sky-600"
      backTo="/"
      tabs={tabs}
      defaultTabId="itens"
    />
  )
}
