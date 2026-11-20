// src/modules/conferencia/components/dashboard-views/PanoramaConferencia.tsx
// Panorama de UMA conferência (por padrão a última): números principais, itens sem estoque
// e os itens que mais faltaram e sobraram.
import { CalendarClock, MapPin, User, Timer, LayoutTemplate, CircleSlash, PackageX } from 'lucide-react'
import type { Fato, ResumoConferencia } from '../../lib/dashboardMetricas'
import { fmtNum, fmtPct, fmtSinal } from '../../lib/dashboardMetricas'
import { KpiTile } from './KpiTile'
import { COR } from './dashCores'

export interface MetaConferencia {
  filial: string | null
  padrao: string | null
  criador: string | null
  tempo: string | null
  quando: string // data e hora já formatadas
}

interface Props {
  resumo: ResumoConferencia
  fatos: Fato[] // só desta conferência
  meta: MetaConferencia
  tolerancia: number
  /** é a conferência mais recente (muda só o rótulo) */
  ehUltima: boolean
}

const nomeItem = (f: Fato) => (f.marcaNome ? `${f.itemNome} ${f.marcaNome}` : f.itemNome)

export function PanoramaConferencia({ resumo: r, fatos, meta, tolerancia, ehUltima }: Props) {
  const pesados = fatos.filter((f) => f.status !== 'pendente')
  const semEstoque = fatos.filter((f) => f.status === 'pendente')
  // não pesado = sem estoque no físico; se o sistema diz que tem, vale olhar
  const semEstoqueComSistema = semEstoque.filter((f) => f.sistema > 1e-9)
  const kgSemEstoqueComSistema = semEstoqueComSistema.reduce((s, f) => s + f.sistema, 0)
  const semSistema = pesados.filter((f) => Math.abs(f.sistema) < 1e-9)

  const faltas = pesados.filter((f) => f.status === 'falta').sort((a, b) => a.divergencia - b.divergencia)
  const sobras = pesados.filter((f) => f.status === 'sobra').sort((a, b) => b.divergencia - a.divergencia)
  const maiorFalta = faltas[0]?.divergencia ?? 0
  const maiorSobra = sobras[0]?.divergencia ?? 0
  const escala = Math.max(Math.abs(maiorFalta), maiorSobra, 1)

  const chips = [
    { icone: CalendarClock, texto: meta.quando },
    meta.filial && { icone: MapPin, texto: meta.filial },
    meta.padrao && { icone: LayoutTemplate, texto: meta.padrao },
    meta.criador && { icone: User, texto: meta.criador },
    meta.tempo && { icone: Timer, texto: meta.tempo },
  ].filter(Boolean) as { icone: typeof MapPin; texto: string }[]

  return (
    <section aria-labelledby="panorama-titulo" className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {ehUltima ? 'Última conferência' : 'Conferência selecionada'}
        </p>
        <h3 id="panorama-titulo" className="text-xl font-semibold text-slate-900 mt-0.5">
          {r.conferencia.nome?.trim() || 'Conferência sem nome'}
        </h3>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-slate-600">
          {chips.map(({ icone: Icone, texto }) => (
            <li key={texto} className="inline-flex items-center gap-1.5">
              <Icone className="w-3.5 h-3.5 text-slate-400" />
              {texto}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          titulo="Saldo"
          ajuda="Falta menos sobra desta conferência. Negativo: faltou mais do que sobrou."
          valor={`${fmtSinal(r.liquida, 1)} kg`}
          detalhe={`${pesados.length} ${pesados.length === 1 ? 'item pesado' : 'itens pesados'}`}
        />
        <KpiTile
          titulo="Acuracidade"
          ajuda={`Parte dos itens pesados em que o encontrado ficou dentro da tolerância (± ${fmtNum(tolerancia)} kg) do sistema.`}
          valor={fmtPct(r.acuracidade)}
          detalhe={`${r.ok} de ${r.conferidos} dentro da tolerância`}
        />
        <KpiTile
          titulo="Falta"
          marcador={COR.falta}
          ajuda="Quanto o encontrado ficou abaixo do sistema, somando os itens com falta."
          valor={`${fmtNum(r.faltaTotal, 1)} kg`}
          detalhe={`${r.falta} ${r.falta === 1 ? 'item' : 'itens'}`}
        />
        <KpiTile
          titulo="Sobra"
          marcador={COR.sobra}
          ajuda="Quanto o encontrado ficou acima do sistema, somando os itens com sobra."
          valor={`${fmtNum(r.sobraTotal, 1)} kg`}
          detalhe={`${r.sobra} ${r.sobra === 1 ? 'item' : 'itens'}`}
        />
      </div>

      {(semEstoque.length > 0 || semSistema.length > 0) && (
        <div className="flex flex-col sm:flex-row gap-2">
          {semEstoque.length > 0 && (
            <p className="flex-1 flex items-start gap-2 rounded-xl bg-slate-100 px-3 py-2.5 text-sm text-slate-700">
              <PackageX className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" />
              <span>
                <b className="font-semibold text-slate-900">
                  {semEstoque.length} {semEstoque.length === 1 ? 'item sem estoque' : 'itens sem estoque'}
                </b>{' '}
                (não pesados)
                {semEstoqueComSistema.length > 0 && (
                  <>
                    {' '}
                    — {semEstoqueComSistema.length} {semEstoqueComSistema.length === 1 ? 'consta' : 'constam'} no sistema com{' '}
                    {fmtNum(kgSemEstoqueComSistema, 1)} kg
                  </>
                )}
                .
              </span>
            </p>
          )}
          {semSistema.length > 0 && (
            <p className="flex-1 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
              <CircleSlash className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
              <span>
                <b className="font-semibold">
                  {semSistema.length} {semSistema.length === 1 ? 'item pesado sem' : 'itens pesados sem'} valor do sistema
                </b>{' '}
                — {semSistema.map(nomeItem).slice(0, 2).join(', ')}
                {semSistema.length > 2 && ` e mais ${semSistema.length - 2}`}. {semSistema.length === 1 ? 'Entra' : 'Entram'} como
                sobra.
              </span>
            </p>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        <ListaDestaque
          titulo="Maiores faltas"
          vazio="Nenhum item com falta."
          itens={faltas.slice(0, 5)}
          cor={COR.falta}
          escala={escala}
        />
        <ListaDestaque
          titulo="Maiores sobras"
          vazio="Nenhum item com sobra."
          itens={sobras.slice(0, 5)}
          cor={COR.sobra}
          escala={escala}
        />
      </div>
    </section>
  )
}

function ListaDestaque({
  titulo,
  vazio,
  itens,
  cor,
  escala,
}: {
  titulo: string
  vazio: string
  itens: Fato[]
  cor: string
  escala: number
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 min-w-0">
      <h4 className="text-sm font-semibold text-slate-900">{titulo}</h4>
      {itens.length === 0 ? (
        <p className="text-sm text-slate-500 mt-3">{vazio}</p>
      ) : (
        <ol className="mt-2 divide-y divide-slate-100">
          {itens.map((f) => (
            <li key={f.registroId} className="py-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 items-center">
              <div className="min-w-0">
                <p className="text-sm text-slate-900 truncate">
                  {f.itemNome} {f.marcaNome && <span className="text-xs text-slate-500">{f.marcaNome}</span>}
                </p>
                <div className="h-1.5 mt-1 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(3, (Math.abs(f.divergencia) / escala) * 100)}%`, background: cor }}
                  />
                </div>
              </div>
              <div className="text-right tabular-nums">
                <p className="text-sm font-semibold" style={{ color: cor }}>
                  {fmtSinal(f.divergencia, 1)} kg
                </p>
                <p className="text-[11px] text-slate-500">
                  {fmtNum(f.sistema, 1)} → {fmtNum(f.fisico, 1)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
