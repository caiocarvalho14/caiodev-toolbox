// src/modules/conferencia/components/ConferenciaManager.tsx
import { useState } from 'react'
import { Breadcrumb } from '../../../../components/ui/Breadcrumb'
import ConferenciasLista from './conferencia-views/ConferenciaLista'
import RegistrosLista from './conferencia-views/RegistrosLista'
import ContagensDetalhe from './conferencia-views/ContagensDetalhe'
import { itensRepository } from '../../../modules/conferencia/repositories/itensRepository'
import { useOfflineList } from '../../../../hooks/useOfflineList'
import type { Conferencia } from '../../../modules/conferencia/types/Conferencia'
import type { RegistroConferencia } from '../../../modules/conferencia/types/registro'

type View = 'lista' | 'registros' | 'contagens'

export default function ConferenciaManager() {
  const [view, setView] = useState<View>('lista')
  const [conferenciaAtiva, setConferenciaAtiva] = useState<Conferencia | null>(null)
  const [registroAtivo, setRegistroAtivo] = useState<RegistroConferencia | null>(null)
  const { data: itens } = useOfflineList(itensRepository)

  const abrirConferencia = (c: Conferencia) => {
    setConferenciaAtiva(c)
    setView('registros')
  }

  const abrirRegistro = (r: RegistroConferencia) => {
    setRegistroAtivo(r)
    setView('contagens')
  }

  const voltarParaLista = () => {
    setView('lista')
    setConferenciaAtiva(null)
    setRegistroAtivo(null)
  }

  const voltarParaRegistros = () => {
    setView('registros')
    setRegistroAtivo(null)
  }

  const nomeItemAtivo = registroAtivo
    ? itens.find((i) => i.id === registroAtivo.item)?.nome ?? 'Registro'
    : ''

  return (
    <div>
      {view !== 'lista' && (
        <Breadcrumb
          items={[
            { label: 'Conferências', onClick: voltarParaLista },
            ...(conferenciaAtiva
              ? [
                  {
                    label: conferenciaAtiva.nome || new Date(conferenciaAtiva.data + 'T00:00:00').toLocaleDateString('pt-BR'),
                    onClick: view === 'contagens' ? voltarParaRegistros : undefined,
                  },
                ]
              : []),
            ...(view === 'contagens' ? [{ label: nomeItemAtivo }] : []),
          ]}
        />
      )}

      {view === 'lista' && <ConferenciasLista onSelect={abrirConferencia} />}

      {view === 'registros' && conferenciaAtiva && (
        <RegistrosLista conferencia={conferenciaAtiva} onSelect={abrirRegistro} />
      )}

      {view === 'contagens' && registroAtivo && <ContagensDetalhe registro={registroAtivo} />}
    </div>
  )
}