export const formatarDataHora = (iso: string) => {
  if (!iso) return ''
  const data = new Date(iso)
  
  // Formata a data (DD/MM/AAAA)
  const dataFormatada = data.toLocaleDateString('pt-BR')
  
  // Formata a hora (HH:mm)
  const horaFormatada = data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })

  return `${dataFormatada} : ${horaFormatada}`
}

export function formatarDataAtual() {
  const agora = new Date();

  // Extrair componentes UTC (ou substitua por getYear/getMonth se preferir o fuso local)
  const ano = agora.getUTCFullYear();
  const mes = String(agora.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(agora.getUTCDate()).padStart(2, '0');
  const horas = String(agora.getUTCHours()).padStart(2, '0');
  const minutos = String(agora.getUTCMinutes()).padStart(2, '0');
  const segundos = String(agora.getUTCSeconds()).padStart(2, '0');
  
  // Milissegundos convertidos para microssegundos (adicionando três zeros no final para ter 6 dígitos)
  const milissegundos = String(agora.getUTCMilliseconds()).padStart(3, '0');
  const microssegundos = milissegundos + '000'; 

  return `${ano}-${mes}-${dia} ${horas}:${minutos}:${segundos}.${microssegundos}+00`;
}