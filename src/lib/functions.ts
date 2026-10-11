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