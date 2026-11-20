// src/modules/conferencia/components/conferencia-views/ContagensDetalhe.tsx
// Tela de pesagem de um item.
// - Celular/tablet (< lg): "modo pesagem" que cabe numa tela só, com teclado numérico próprio
//   (o teclado do sistema não sobe e não cobre a tela) e alvos de toque grandes.
// - Desktop (lg+): duas colunas — formulário com campos digitáveis (Enter registra) e a lista
//   de pesagens sempre visível ao lado.
import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowLeft, Delete, List, Minus, Plus, Trash2, Undo2, Pencil, Check, Scale } from 'lucide-react'
import { useToast } from '../../../../../hooks/useToast'
import { Modal } from '../../../../../components/ui/Modal'
import { ConfirmDialog } from '../../../../../components/ui/ConfirmDialog'
import { useOfflineList } from '../../../../../hooks/useOfflineList'
import { registrosRepository } from '../../../../modules/conferencia/repositories/registrosRespoitory'
import { contagensRepository } from '../../../../modules/conferencia/repositories/contagensRepository'
import { itensRepository } from '../../../cadastros/repositories/itensRepository'
import { marcasRepository } from '../../../cadastros/repositories/marcasRepository'
import { locaisRepository } from '../../../cadastros/repositories/locaisRepository'
import type { RegistroConferencia } from '../../../../modules/conferencia/types/registro'
import { itemDoRegistro } from '../../lib/itemDoRegistro'
import { temDetalhe, calcularLiquido } from '../../types/contagem'

interface Props {
  registro: RegistroConferencia
  /** volta para a lista de registros (botão do topo) */
  onVoltar?: () => void
}

type Alvo = 'peso' | 'tara' | 'caixas'

const fmt = (n: number, casas = 2) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
const fmtQtd = (n: number, unidade: 'KG' | 'UND') =>
  unidade === 'KG' ? fmt(n) : n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
const paraNumero = (s: string) => (s ? Number(s.replace(',', '.')) || 0 : 0)
const paraTexto = (n: number) => (n ? String(n).replace('.', ',') : '')
const hora = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''

/** limpa o que foi digitado no teclado físico: só dígitos e uma vírgula, no máximo 2 casas */
const sanitizar = (v: string, decimais: boolean) => {
  let s = v.replace(/\./g, ',').replace(/[^0-9,]/g, '')
  if (!decimais) s = s.replace(/,/g, '')
  const [inteiro, ...resto] = s.split(',')
  return (resto.length ? `${inteiro || '0'},${resto.join('').slice(0, 2)}` : inteiro).slice(0, 9)
}

const corDivergencia = (d: number) =>
  d < -0.001 ? 'bg-red-50 text-red-700' : d > 0.001 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'

const tecla =
  'flex items-center justify-center rounded-xl bg-white border border-slate-200 text-2xl font-semibold text-slate-900 ' +
  'active:bg-slate-200 select-none touch-manipulation transition-colors disabled:opacity-30 min-h-0 baixa:text-xl'

function useDesktop() {
  const consulta = '(min-width: 1024px)'
  const [desktop, setDesktop] = useState(() => window.matchMedia(consulta).matches)
  useEffect(() => {
    const mq = window.matchMedia(consulta)
    const onChange = () => setDesktop(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return desktop
}

export default function ContagensDetalhe({ registro: registroProp, onVoltar }: Props) {
  const { data: registros, reload: reloadRegistros } = useOfflineList(registrosRepository, 'conf_registro')
  const { data: todasContagens, loading, reload: reloadContagens } = useOfflineList(contagensRepository, 'conf_contagem')
  const { data: itens } = useOfflineList(itensRepository, 'cad_item')
  const { data: marcas } = useOfflineList(marcasRepository, 'cad_marca')
  const { data: locais } = useOfflineList(locaisRepository, 'cad_local')
  const { toast } = useToast()
  const desktop = useDesktop()
  const pesoRef = useRef<HTMLInputElement>(null)

  type ContagemEditavel = (typeof todasContagens)[number]

  const registro = registros.find((r) => r.id === registroProp.id) ?? registroProp
  const contagens = todasContagens
    .filter((c) => c.registro === registro.id)
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))

  const item = itemDoRegistro(registro, itens, marcas)
  const taraPadrao = item.tara ?? 0
  const unidade = item.unidade
  const usaTara = unidade === 'KG'

  // --- entrada da nova pesagem (strings no formato pt-BR) ---
  const [alvo, setAlvo] = useState<Alvo>('peso')
  const [pesoStr, setPesoStr] = useState('')
  const [taraStr, setTaraStr] = useState<string | null>(null) // null = usa a tara padrão da marca
  const [caixasStr, setCaixasStr] = useState('1')
  const [registrando, setRegistrando] = useState(false)
  const [ultimaId, setUltimaId] = useState<string | null>(null)

  const [localSalvo, setLocalSalvo] = useState(() => {
    try {
      return localStorage.getItem('localSelecionado') ?? ''
    } catch {
      return ''
    }
  })
  // se o local salvo não existe (ou ainda não carregou), cai no primeiro da lista
  const localAtivo = locais.some((l) => l.id === localSalvo) ? localSalvo : locais[0]?.id ?? ''
  const escolherLocal = (id: string) => {
    setLocalSalvo(id)
    try {
      localStorage.setItem('localSelecionado', id)
    } catch {
      /* armazenamento indisponível: só não lembra o local */
    }
  }

  const taraTexto = taraStr ?? paraTexto(taraPadrao)
  const peso = paraNumero(pesoStr)
  const taraUnit = paraNumero(taraTexto)
  const caixas = paraNumero(caixasStr)
  const taraTotal = usaTara ? Math.round(taraUnit * caixas * 100) / 100 : 0
  const liquido = Math.round((peso - taraTotal) * 100) / 100

  const qtdFisico = contagens.reduce((sum, c) => sum + c.contagem, 0)
  const divergencia = qtdFisico - registro.qtd_sistema
  const localNome = (id: string) => locais.find((l) => l.id === id)?.nome || 'Local removido'
  const ultima = ultimaId ? contagens.find((c) => c.id === ultimaId) : contagens[0]

  // --- janelas ---
  const [infoAberta, setInfoAberta] = useState(false)
  const [listaAberta, setListaAberta] = useState(false)
  const [observacoes, setObservacoes] = useState(registro.observacoes || '')
  const [qtdSistema, setQtdSistema] = useState(String(registro.qtd_sistema))
  const [salvandoInfo, setSalvandoInfo] = useState(false)
  const [confirmarExcluir, setConfirmarExcluir] = useState<string | null>(null)

  const [editando, setEditando] = useState<ContagemEditavel | null>(null)
  const [valorEditado, setValorEditado] = useState('')
  // edição de pesagem com detalhe: bruto, caixas e tara (o líquido é recalculado)
  const [brutoEditado, setBrutoEditado] = useState('')
  const [caixasEditado, setCaixasEditado] = useState('')
  const [taraEditada, setTaraEditada] = useState('')
  const [localEditado, setLocalEditado] = useState('')
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)

  // no celular a tela de pesagem ocupa a tela toda: trava a rolagem da página por trás
  useEffect(() => {
    if (!window.matchMedia('(max-width: 639px)').matches) return
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = anterior
    }
  }, [])

  // no desktop já entra pronto para digitar o peso
  useEffect(() => {
    if (desktop) pesoRef.current?.focus()
  }, [desktop])

  // --- teclado numérico (celular) ---
  const valorDoAlvo = alvo === 'peso' ? pesoStr : alvo === 'tara' ? taraTexto : caixasStr
  const definirAlvo = (v: string) => {
    if (alvo === 'peso') setPesoStr(v)
    else if (alvo === 'tara') setTaraStr(v)
    else setCaixasStr(v)
  }
  const aceitaVirgula = alvo !== 'caixas' && (alvo === 'tara' || usaTara)

  const pressionar = useCallback(
    (k: string) => {
      const atual = valorDoAlvo
      if (k === 'apagar') return definirAlvo(atual.slice(0, -1))
      if (k === ',') {
        if (!aceitaVirgula || atual.includes(',')) return
        return definirAlvo(atual ? atual + ',' : '0,')
      }
      const [, dec] = atual.split(',')
      if (dec !== undefined && dec.length >= 2) return // no máximo 2 casas decimais
      if (atual.replace(',', '').length >= 7) return
      definirAlvo(atual === '0' ? k : atual + k)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [valorDoAlvo, alvo, aceitaVirgula]
  )

  const vibrar = () => {
    try {
      navigator.vibrate?.(30)
    } catch {
      /* sem vibração */
    }
  }

  /**
   * - 'liquido': desconta as caixas (bruto − caixas × tara)
   * - 'bruto': grava o peso da balança sem desconto (0 caixas)
   * - 'unidade': item contado por unidade, sem bruto nem caixas
   */
  const registrarContagem = async (modo: 'liquido' | 'bruto' | 'unidade') => {
    const qtdCaixas = modo === 'liquido' ? Math.round(caixas) : 0
    const valor = modo === 'unidade' ? peso : calcularLiquido(peso, qtdCaixas, taraUnit)
    if (!localAtivo) {
      toast({ variant: 'destructive', title: 'Cadastre um local antes de pesar' })
      return
    }
    if (valor <= 0) {
      toast({ variant: 'destructive', title: 'Informe uma quantidade válida' })
      return
    }
    try {
      setRegistrando(true)
      const salva = await contagensRepository.save({
        registro: registro.id,
        local: localAtivo,
        contagem: Math.round(valor * 100) / 100,
        // detalhe da pesagem: permite conferir e recalcular o líquido depois
        ...(modo === 'unidade'
          ? {}
          : { peso_bruto: Math.round(peso * 100) / 100, qtd_caixas: qtdCaixas, tara_caixa: Math.round(taraUnit * 1000) / 1000 }),
        // horário real da pesagem: sem isso o servidor usaria a hora da sincronização
        created_at: new Date().toISOString(),
      })
      setUltimaId(salva.id)
      setPesoStr('')
      setAlvo('peso')
      vibrar()
      await reloadContagens()
      if (desktop) pesoRef.current?.focus()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setRegistrando(false)
    }
  }

  const podeRegistrar = !registrando && (usaTara ? liquido > 0 : peso > 0)
  const registrarPrincipal = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (podeRegistrar) registrarContagem(usaTara ? 'liquido' : 'unidade')
  }

  const ajustarCaixas = (delta: number) => {
    setCaixasStr(String(Math.max(0, caixas + delta)))
    if (!desktop) setAlvo('caixas')
  }

  const removerContagem = async (id: string) => {
    await contagensRepository.remove(id)
    if (id === ultimaId) setUltimaId(null)
    setConfirmarExcluir(null)
    await reloadContagens()
  }

  // desfazer pede confirmação: um toque sem querer apagaria uma pesagem
  const [confirmarDesfazer, setConfirmarDesfazer] = useState(false)
  const [desfazendo, setDesfazendo] = useState(false)

  const desfazerUltima = async () => {
    if (!ultima) return
    try {
      setDesfazendo(true)
      await removerContagem(ultima.id)
      toast({ title: `${usaTara ? 'Pesagem' : 'Contagem'} de ${fmtQtd(ultima.contagem, unidade)} ${unidade} desfeita` })
    } finally {
      setDesfazendo(false)
      setConfirmarDesfazer(false)
    }
  }

  const abrirEdicao = (c: ContagemEditavel) => {
    setListaAberta(false)
    setEditando(c)
    setValorEditado(paraTexto(c.contagem))
    setBrutoEditado(paraTexto(c.peso_bruto ?? 0))
    setCaixasEditado(String(c.qtd_caixas ?? 0))
    setTaraEditada(paraTexto(c.tara_caixa ?? 0))
    // se o local foi removido, obriga a escolher outro em vez de manter um id inexistente
    setLocalEditado(locais.some((l) => l.id === c.local) ? c.local : '')
  }

  const salvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editando) return
    const comDetalhe = temDetalhe(editando)
    const bruto = Math.round(paraNumero(brutoEditado) * 100) / 100
    const qtdCaixas = Math.round(paraNumero(caixasEditado))
    const taraCaixa = Math.round(paraNumero(taraEditada) * 1000) / 1000
    const valor = comDetalhe ? calcularLiquido(bruto, qtdCaixas, taraCaixa) : paraNumero(valorEditado.trim())
    if (!localEditado) {
      toast({ variant: 'destructive', title: 'Selecione um local' })
      return
    }
    if (valor <= 0) {
      toast({ variant: 'destructive', title: 'Informe uma quantidade válida' })
      return
    }
    const valorFinal = Math.round(valor * 100) / 100
    // nada mudou: só fecha, sem gerar item na fila de sincronização
    const detalheIgual =
      !comDetalhe ||
      (bruto === editando.peso_bruto && qtdCaixas === editando.qtd_caixas && taraCaixa === editando.tara_caixa)
    if (valorFinal === editando.contagem && localEditado === editando.local && detalheIgual) {
      setEditando(null)
      return
    }
    try {
      setSalvandoEdicao(true)
      // espalha a contagem: editar não muda o horário em que ela foi feita
      await contagensRepository.save({
        ...editando,
        local: localEditado,
        contagem: valorFinal,
        ...(comDetalhe ? { peso_bruto: bruto, qtd_caixas: qtdCaixas, tara_caixa: taraCaixa } : {}),
      })
      toast({ title: usaTara ? 'Pesagem atualizada' : 'Contagem atualizada' })
      setEditando(null)
      await reloadContagens()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSalvandoEdicao(false)
    }
  }

  const abrirInfo = () => {
    setQtdSistema(paraTexto(registro.qtd_sistema) || '0')
    setObservacoes(registro.observacoes || '')
    setInfoAberta(true)
  }

  const salvarInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSalvandoInfo(true)
      // espalha o registro: preserva os campos do item digitado (conferência rápida)
      await registrosRepository.save({
        ...registro,
        qtd_sistema: paraNumero(qtdSistema.trim()),
        observacoes: observacoes.trim() || null,
      })
      toast({ title: 'Registro atualizado' })
      setInfoAberta(false)
      await reloadRegistros()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSalvandoInfo(false)
    }
  }

  // campo de valor: no celular é só leitura (quem digita é o teclado da tela); no desktop é digitável
  const campo = (ativo: boolean) =>
    `rounded-xl border-2 bg-white transition-colors touch-manipulation cursor-text ${
      ativo ? 'border-slate-900' : 'border-slate-200 hover:border-slate-300'
    }`
  const propsCampo = (a: Alvo, decimais: boolean, valor: string, setValor: (v: string) => void) => ({
    value: valor,
    readOnly: !desktop,
    inputMode: desktop ? ('decimal' as const) : ('none' as const),
    autoComplete: 'off',
    onFocus: () => setAlvo(a),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValor(sanitizar(e.target.value, decimais)),
  })

  const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'apagar']

  /** "bruto 12,50 · 2 cx × 0,80" (só pesagens com detalhe) */
  const textoDetalhe = (c: ContagemEditavel) =>
    temDetalhe(c)
      ? `bruto ${fmt(c.peso_bruto!)}${c.qtd_caixas ? ` · ${c.qtd_caixas} cx × ${fmt(c.tara_caixa ?? 0)}` : ' · sem caixas'}`
      : null

  const listaPesagens =
    contagens.length === 0 ? (
      <p className="px-4 py-6 text-sm text-slate-600 text-center">
        {loading ? 'Carregando...' : `Nenhuma ${usaTara ? 'pesagem' : 'contagem'} ainda.`}
      </p>
    ) : (
      <ul className="divide-y divide-slate-100">
        {contagens.map((c) => (
          <li key={c.id} className="flex items-center gap-1 px-2 py-1 lg:px-3">
            <button
              type="button"
              onClick={() => abrirEdicao(c)}
              className="flex-1 min-w-0 min-h-12 text-left rounded-lg px-1 active:bg-slate-100 lg:hover:bg-slate-50"
            >
              <span className="block font-semibold text-slate-900 tabular-nums">
                {fmtQtd(c.contagem, unidade)} {unidade}
              </span>
              <span className="block text-xs text-slate-600 truncate">
                {localNome(c.local)}
                {c.created_at ? ` · ${hora(c.created_at)}` : ''}
              </span>
              {textoDetalhe(c) && (
                <span className="block text-xs text-slate-500 truncate tabular-nums">{textoDetalhe(c)}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => abrirEdicao(c)}
              aria-label="Editar"
              title="Editar"
              className="w-12 h-12 lg:w-10 lg:h-10 flex items-center justify-center rounded-xl text-slate-600 active:bg-slate-100 hover:bg-slate-100 hover:text-slate-900"
            >
              <Pencil className="w-5 h-5 lg:w-4 lg:h-4" />
            </button>
            {confirmarExcluir === c.id ? (
              <button
                type="button"
                onClick={() => removerContagem(c.id)}
                onBlur={() => setConfirmarExcluir(null)}
                className="h-12 lg:h-10 px-3 inline-flex items-center gap-1 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
              >
                <Check className="w-4 h-4" />
                Excluir
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmarExcluir(c.id)}
                aria-label="Excluir"
                title="Excluir"
                className="w-12 h-12 lg:w-10 lg:h-10 flex items-center justify-center rounded-xl text-slate-600 active:bg-red-50 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="w-5 h-5 lg:w-4 lg:h-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
    )

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-slate-50 h-dvh
        sm:static sm:z-auto sm:h-[720px] sm:max-w-md sm:mx-auto sm:rounded-2xl sm:border sm:border-slate-200 sm:overflow-hidden
        lg:h-auto lg:max-w-none lg:mx-0 lg:rounded-none lg:border-0 lg:bg-transparent lg:overflow-visible
        lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6 lg:items-start"
    >
      {/* ===== Coluna principal: item, resumo e nova pesagem ===== */}
      <section className="flex-1 min-h-0 flex flex-col lg:flex-none lg:bg-white lg:border lg:border-slate-200 lg:rounded-2xl lg:overflow-hidden">
        {/* Topo: voltar, item e (no celular) lista de pesagens */}
        <header className="flex items-center gap-1 px-1.5 py-1.5 bg-white border-b border-slate-200 shrink-0 lg:px-5 lg:py-4 lg:gap-3">
          {onVoltar && (
            <button
              type="button"
              onClick={onVoltar}
              aria-label="Voltar para os registros"
              title="Voltar para os registros"
              className="lg:hidden w-12 h-12 baixa:h-11 shrink-0 flex items-center justify-center rounded-xl text-slate-700 active:bg-slate-100 hover:bg-slate-100"
            >
              <ArrowLeft className="w-6 h-6 lg:w-5 lg:h-5" />
            </button>
          )}
          <div className="min-w-0 flex-1 px-1">
            <h2 className="text-base lg:text-xl font-semibold text-slate-900 leading-tight truncate">{item.nome}</h2>
            <p className="text-xs lg:text-sm text-slate-600 truncate">
              {[item.codigo, item.marcaNome, unidade, item.avulso ? 'digitado na hora' : null].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setListaAberta(true)}
            aria-label={`Ver ${contagens.length} ${usaTara ? 'pesagens' : 'contagens'}`}
            className="lg:hidden relative h-12 baixa:h-11 px-3 shrink-0 flex items-center gap-1.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 active:bg-slate-100"
          >
            <List className="w-5 h-5" />
            {contagens.length}
          </button>
        </header>

        <form
          onSubmit={registrarPrincipal}
          className="flex-1 min-h-0 flex flex-col gap-2 p-2.5 baixa:gap-1.5 baixa:p-2 lg:flex-none lg:gap-4 lg:p-5"
        >
          {/* Resumo: físico, sistema (clique para editar) e divergência */}
          <div className="grid grid-cols-3 gap-2 lg:gap-3 shrink-0">
            <div className="rounded-xl bg-white border border-slate-200 px-2.5 py-1.5 baixa:py-1 lg:px-4 lg:py-3">
              <p className="text-[11px] lg:text-xs font-medium uppercase tracking-wide text-slate-600">Físico</p>
              <p className="text-base baixa:text-sm lg:text-2xl font-semibold text-slate-900 tabular-nums truncate">
                {fmtQtd(qtdFisico, unidade)}
              </p>
            </div>
            <button
              type="button"
              onClick={abrirInfo}
              aria-label="Editar valor do sistema e observações"
              title="Editar valor do sistema e observações"
              className="rounded-xl bg-white border border-slate-200 px-2.5 py-1.5 baixa:py-1 lg:px-4 lg:py-3 text-left active:bg-slate-100 hover:border-slate-300 hover:bg-slate-50"
            >
              <p className="flex items-center gap-1 text-[11px] lg:text-xs font-medium uppercase tracking-wide text-slate-600">
                Sistema <Pencil className="w-3 h-3" />
              </p>
              <p className="text-base baixa:text-sm lg:text-2xl font-semibold text-slate-900 tabular-nums truncate">
                {fmtQtd(registro.qtd_sistema, unidade)}
              </p>
            </button>
            <div className={`rounded-xl px-2.5 py-1.5 baixa:py-1 lg:px-4 lg:py-3 ${corDivergencia(divergencia)}`}>
              <p className="text-[11px] lg:text-xs font-medium uppercase tracking-wide opacity-80">Divergência</p>
              <p className="text-base baixa:text-sm lg:text-2xl font-semibold tabular-nums truncate">
                {divergencia > 0.001 ? '+' : ''}
                {fmtQtd(divergencia, unidade)}
              </p>
            </div>
          </div>

          {registro.observacoes && (
            <p className="hidden lg:block text-sm text-slate-600 -mt-1">
              <span className="font-medium text-slate-700">Observações:</span> {registro.observacoes}
            </p>
          )}

          <h3 className="hidden lg:flex items-center gap-2 text-sm font-semibold text-slate-900 border-t border-slate-100 pt-4">
            <Scale className="w-4 h-4" />
            Nova {usaTara ? 'pesagem' : 'contagem'}
          </h3>

          {/* Local */}
          {locais.length > 0 && locais.length <= 4 ? (
            <div
              className={`grid gap-1.5 lg:gap-2 shrink-0 ${locais.length === 1 ? 'grid-cols-1' : locais.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} ${locais.length === 4 ? 'sm:grid-cols-4' : ''}`}
              role="radiogroup"
              aria-label="Local"
            >
              {locais.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={localAtivo === l.id}
                  onClick={() => escolherLocal(l.id)}
                  className={`h-11 baixa:h-10 px-2 rounded-xl text-sm font-semibold truncate touch-manipulation transition-colors ${
                    localAtivo === l.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 active:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {l.nome}
                </button>
              ))}
            </div>
          ) : (
            <label className="flex items-center gap-2 lg:gap-3 shrink-0">
              <span className="text-sm font-medium text-slate-700 shrink-0">Local</span>
              <select
                value={localAtivo}
                onChange={(e) => escolherLocal(e.target.value)}
                className="flex-1 h-11 baixa:h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/15"
              >
                {locais.length === 0 && <option value="">Nenhum local cadastrado</option>}
                {locais.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Peso/quantidade + tara: no desktop ficam lado a lado */}
          <div className="flex flex-col gap-2 baixa:gap-1.5 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-3 shrink-0">
            <label
              className={`${campo(alvo === 'peso')} block px-3 py-1.5 baixa:py-1 baixa:flex baixa:items-center baixa:justify-between lg:py-2`}
            >
              <span className="block text-xs font-medium text-slate-600 shrink-0">
                {usaTara ? 'Peso bruto (kg)' : `Quantidade (${unidade})`}
              </span>
              <span className="flex items-baseline justify-end gap-1.5 min-w-0">
                <input
                  ref={pesoRef}
                  {...propsCampo('peso', usaTara, pesoStr, setPesoStr)}
                  placeholder="0"
                  aria-label={usaTara ? 'Peso bruto em kg' : `Quantidade em ${unidade}`}
                  className="w-full min-w-0 bg-transparent text-right text-4xl baixa:text-3xl lg:text-4xl font-bold tabular-nums leading-tight text-slate-900 placeholder:text-slate-300 outline-none cursor-[inherit]"
                />
                <span className="text-base font-medium text-slate-500">{unidade}</span>
              </span>
            </label>

            {usaTara && (
              <div className="flex items-stretch gap-2 lg:gap-3">
                <label className={`${campo(alvo === 'tara')} flex-1 min-w-0 px-2.5 py-1 lg:w-36 lg:flex-none lg:py-2`}>
                  <span className="block text-[11px] lg:text-xs font-medium text-slate-600">Tara/caixa (kg)</span>
                  <input
                    {...propsCampo('tara', true, taraTexto, (v) => setTaraStr(v))}
                    placeholder="0"
                    aria-label="Tara por caixa em kg"
                    className="w-full bg-transparent text-lg lg:text-2xl font-semibold tabular-nums text-slate-900 placeholder:text-slate-300 outline-none cursor-[inherit]"
                  />
                </label>
                <div className={`${campo(alvo === 'caixas')} flex items-center`}>
                  <button
                    type="button"
                    onClick={() => ajustarCaixas(-1)}
                    aria-label="Menos uma caixa"
                    title="Menos uma caixa"
                    className="w-11 h-full flex items-center justify-center text-slate-700 active:bg-slate-100 hover:bg-slate-50 rounded-l-xl"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <label className="px-1 text-center w-14">
                    <span className="block text-[11px] lg:text-xs font-medium text-slate-600">Caixas</span>
                    <input
                      {...propsCampo('caixas', false, caixasStr, setCaixasStr)}
                      placeholder="0"
                      aria-label="Quantidade de caixas"
                      className="w-full bg-transparent text-center text-lg lg:text-2xl font-semibold tabular-nums text-slate-900 placeholder:text-slate-300 outline-none cursor-[inherit]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => ajustarCaixas(1)}
                    aria-label="Mais uma caixa"
                    title="Mais uma caixa"
                    className="w-11 h-full flex items-center justify-center text-slate-700 active:bg-slate-100 hover:bg-slate-50 rounded-r-xl"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Última pesagem, com desfazer */}
          <div className="flex items-center gap-2 h-10 baixa:h-9 shrink-0 text-sm lg:order-last lg:border-t lg:border-slate-100 lg:pt-4 lg:h-auto">
            {ultima ? (
              <>
                <p className="flex-1 min-w-0 truncate text-slate-600">
                  Última:{' '}
                  <span className="font-semibold text-slate-900">
                    {fmtQtd(ultima.contagem, unidade)} {unidade}
                  </span>
                  {' · '}
                  {localNome(ultima.local)}
                  {ultima.qtd_caixas ? ` · ${ultima.qtd_caixas} cx` : ''}
                  {ultima.created_at ? ` · ${hora(ultima.created_at)}` : ''}
                </p>
                <button
                  type="button"
                  onClick={() => setConfirmarDesfazer(true)}
                  className="h-10 baixa:h-9 px-3 shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 active:bg-slate-100 hover:border-slate-300"
                >
                  <Undo2 className="w-4 h-4" />
                  Desfazer
                </button>
              </>
            ) : (
              <p className="text-slate-500">{loading ? 'Carregando...' : `Nenhuma ${usaTara ? 'pesagem' : 'contagem'} ainda.`}</p>
            )}
          </div>

          {/* Teclado numérico: só no celular/tablet, ocupa o espaço que sobrar */}
          <div
            className="lg:hidden flex-1 min-h-[184px] baixa:min-h-[168px] grid grid-cols-3 grid-rows-4 gap-1.5 baixa:gap-1"
            aria-label="Teclado numérico"
          >
            {teclas.map((k) =>
              k === 'apagar' ? (
                <button key={k} type="button" onClick={() => pressionar('apagar')} aria-label="Apagar" className={tecla}>
                  <Delete className="w-7 h-7" />
                </button>
              ) : (
                <button
                  key={k}
                  type="button"
                  onClick={() => pressionar(k)}
                  disabled={k === ',' && !aceitaVirgula}
                  aria-label={k === ',' ? 'Vírgula' : k}
                  className={tecla}
                >
                  {k}
                </button>
              )
            )}
          </div>

          {/* Ações */}
          <div className="flex gap-2 lg:gap-3 shrink-0">
            {usaTara && (
              <button
                type="button"
                onClick={() => registrarContagem('bruto')}
                disabled={registrando || peso <= 0}
                title="Registra o peso sem descontar a tara"
                className="h-14 baixa:h-12 lg:h-12 px-4 lg:px-6 rounded-xl border-2 border-slate-300 bg-white text-base font-semibold text-slate-800 active:bg-slate-100 hover:border-slate-400 disabled:opacity-40"
              >
                {desktop ? 'Registrar bruto' : 'Bruto'}
              </button>
            )}
            <button
              type="submit"
              disabled={!podeRegistrar}
              className="flex-1 h-14 baixa:h-12 lg:h-12 px-4 rounded-xl bg-slate-900 text-white text-base font-semibold active:bg-slate-700 hover:bg-slate-800 disabled:opacity-40 tabular-nums"
            >
              {registrando
                ? 'Registrando...'
                : usaTara
                  ? `Registrar ${liquido > 0 ? `${fmt(liquido)} kg` : 'líquido'}`
                  : 'Registrar'}
              {desktop && podeRegistrar && <span className="ml-2 text-xs font-normal opacity-70">Enter</span>}
            </button>
          </div>
          {usaTara && taraTotal > 0 && (
            <p className="-mt-1 lg:-mt-2 text-center lg:text-left text-xs text-slate-600 shrink-0 tabular-nums baixa:hidden">
              Líquido = bruto − tara {fmt(taraTotal)} kg ({caixasStr || 0} × {fmt(taraUnit)})
            </p>
          )}
        </form>
      </section>

      {/* ===== Desktop: lista de pesagens sempre visível ===== */}
      <aside className="hidden lg:flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden lg:sticky lg:top-16 max-h-[calc(100dvh-6rem)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">
            {usaTara ? 'Pesagens' : 'Contagens'} <span className="text-slate-500 font-normal">({contagens.length})</span>
          </h3>
          <span className="text-sm text-slate-600 tabular-nums">
            Total <span className="font-semibold text-slate-900">{fmtQtd(qtdFisico, unidade)} {unidade}</span>
          </span>
        </div>
        <div className="overflow-y-auto">{listaPesagens}</div>
      </aside>

      {/* Janela (celular): todas as pesagens */}
      <Modal
        open={listaAberta && !desktop}
        onClose={() => {
          setListaAberta(false)
          setConfirmarExcluir(null)
        }}
        title={`${usaTara ? 'Pesagens' : 'Contagens'} (${contagens.length})`}
      >
        <div className="max-h-[60dvh] overflow-y-auto -mx-2">{listaPesagens}</div>
      </Modal>

      <ConfirmDialog
        open={confirmarDesfazer && !!ultima}
        title={`Desfazer última ${usaTara ? 'pesagem' : 'contagem'}?`}
        description={
          ultima
            ? `A ${usaTara ? 'pesagem' : 'contagem'} de ${fmtQtd(ultima.contagem, unidade)} ${unidade} em ${localNome(ultima.local)}${
                ultima.created_at ? ` às ${hora(ultima.created_at)}` : ''
              } será removida.`
            : ''
        }
        confirmLabel="Desfazer"
        loading={desfazendo}
        onCancel={() => setConfirmarDesfazer(false)}
        onConfirm={desfazerUltima}
      />

      {/* Janela: valor do sistema e observações */}
      <Modal open={infoAberta} onClose={() => setInfoAberta(false)} title="Sistema e observações">
        <form onSubmit={salvarInfo} className="space-y-4">
          <div>
            <label htmlFor="qtd_sistema" className="block text-sm font-medium text-slate-700 mb-1.5">
              Quantidade no sistema ({unidade})
            </label>
            <input
              id="qtd_sistema"
              inputMode="decimal"
              value={qtdSistema}
              onChange={(e) => setQtdSistema(e.target.value.replace(/[^0-9.,-]/g, ''))}
              autoFocus
              className="w-full h-12 px-3 rounded-xl border border-slate-300 text-lg text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>
          <div>
            <label htmlFor="observacoes" className="block text-sm font-medium text-slate-700 mb-1.5">
              Observações
            </label>
            <textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              placeholder="Opcional"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setInfoAberta(false)}
              className="flex-1 h-12 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvandoInfo}
              className="flex-1 h-12 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-60"
            >
              {salvandoInfo ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Janela: editar uma pesagem */}
      <Modal open={!!editando} onClose={() => setEditando(null)} title={usaTara ? 'Editar pesagem' : 'Editar contagem'}>
        <form onSubmit={salvarEdicao} className="space-y-4">
          <div>
            <label htmlFor="local_edicao" className="block text-sm font-medium text-slate-700 mb-1.5">
              Local
            </label>
            <select
              id="local_edicao"
              value={localEditado}
              onChange={(e) => setLocalEditado(e.target.value)}
              className="w-full h-12 px-3 rounded-xl border border-slate-300 text-base text-slate-900 bg-white"
            >
              <option value="">Selecione</option>
              {locais.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          </div>
          {editando && temDetalhe(editando) ? (
            <div className="space-y-3">
              <div>
                <label htmlFor="bruto_edicao" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Peso bruto (kg)
                </label>
                <input
                  id="bruto_edicao"
                  inputMode="decimal"
                  value={brutoEditado}
                  onChange={(e) => setBrutoEditado(sanitizar(e.target.value, true))}
                  autoFocus
                  className="w-full h-12 px-3 rounded-xl border border-slate-300 text-lg text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="caixas_edicao" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Caixas
                  </label>
                  <input
                    id="caixas_edicao"
                    inputMode="numeric"
                    value={caixasEditado}
                    onChange={(e) => setCaixasEditado(sanitizar(e.target.value, false))}
                    className="w-full h-12 px-3 rounded-xl border border-slate-300 text-lg text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                  />
                </div>
                <div>
                  <label htmlFor="tara_edicao" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Tara/caixa (kg)
                  </label>
                  <input
                    id="tara_edicao"
                    inputMode="decimal"
                    value={taraEditada}
                    onChange={(e) => setTaraEditada(sanitizar(e.target.value, true))}
                    className="w-full h-12 px-3 rounded-xl border border-slate-300 text-lg text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                  />
                </div>
              </div>
              <p className="text-sm text-slate-700 rounded-xl bg-slate-100 px-3 py-2 tabular-nums">
                Líquido:{' '}
                <span className="font-semibold text-slate-900">
                  {fmt(calcularLiquido(paraNumero(brutoEditado), Math.round(paraNumero(caixasEditado)), paraNumero(taraEditada)))} kg
                </span>
              </p>
            </div>
          ) : (
            <div>
              <label htmlFor="quantidade_edicao" className="block text-sm font-medium text-slate-700 mb-1.5">
                Quantidade ({unidade})
              </label>
              <input
                id="quantidade_edicao"
                inputMode="decimal"
                value={valorEditado}
                onChange={(e) => setValorEditado(sanitizar(e.target.value, true))}
                autoFocus
                className="w-full h-12 px-3 rounded-xl border border-slate-300 text-lg text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
              {usaTara && (
                <p className="text-xs text-slate-600 mt-1.5">
                  Pesagem registrada sem detalhe de bruto e caixas: informe o valor final (líquido).
                </p>
              )}
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setEditando(null)}
              className="flex-1 h-12 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvandoEdicao}
              className="flex-1 h-12 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-60"
            >
              {salvandoEdicao ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
