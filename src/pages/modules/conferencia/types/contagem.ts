// src/modules/conferencia/types/contagem.ts
export interface Contagem {
  id: string
  registro: string
  local: string
  /** valor que conta (líquido): peso_bruto - qtd_caixas * tara_caixa */
  contagem: number
  /** horário da pesagem, gravado no aparelho na hora (não na sincronização) */
  created_at?: string
  // detalhe da pesagem (opcional: pesagens antigas e itens por unidade não têm)
  /** o que a balança mostrou */
  peso_bruto?: number | null
  /** quantas caixas foram pesadas junto */
  qtd_caixas?: number | null
  /** tara de UMA caixa usada nesta pesagem (fica gravada mesmo se a tara da marca mudar depois) */
  tara_caixa?: number | null
}

/** A pesagem guarda bruto e caixas (pesagens novas de itens em KG). */
export const temDetalhe = (c: Contagem) => c.peso_bruto != null && c.qtd_caixas != null

/** líquido = bruto - caixas × tara, arredondado em 2 casas */
export const calcularLiquido = (bruto: number, caixas: number, taraCaixa: number) =>
  Math.round((bruto - caixas * taraCaixa) * 100) / 100
