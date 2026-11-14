// src/modules/conferencia/components/dashboard-views/dashCores.ts
// Par divergente validado (falta = vermelho, sobra = azul) + neutros. Validado contra fundo branco.
export const COR = {
  falta: '#d03b3b',
  faltaSuave: '#fbe4e4',
  sobra: '#2a78d6',
  sobraSuave: '#dceafb',
  ok: '#a8a7a0', // neutro: "dentro da tolerância" não é cor de status
  serie: '#2a78d6', // série única (acuracidade, pesagens, locais)
  grade: '#e5e7eb',
  eixo: '#cbd5e1',
  texto: '#0f172a',
  textoSec: '#64748b',
} as const
