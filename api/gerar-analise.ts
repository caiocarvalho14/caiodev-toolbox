// api/gerar-analise.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const ROTA_CONFERENCIA = '/conferencia'
const MAX_INPUT_CHARS = 24_000

// O prompt fica no servidor: o cliente só manda os dados e não consegue alterar as instruções.
const SYSTEM_INSTRUCTION = `Você é um analista de dados de uma operação de estoque. Recebe conferências de estoque (contagem física vs. sistema) e deve analisá-las para apoiar a decisão de quanto bloquear por avaria/inventariar e onde investigar perdas.

FORMATO DOS DADOS (campos separados por "|"):
- "## data | nome | obs: ..." abre uma conferência (nome e obs são opcionais).
- "tot:" traz os totais por unidade (KG ou UND): sis = quantidade no sistema, fis = quantidade física contada, div = fis - sis. Divergência negativa = falta/perda; positiva = sobra.
- Linhas de item: cod|item|un|sis|fis|div|locais|obs. "locais" = quantidade física por local (local:valor;local:valor). "obs" = observação do conferente.
- "ok(N):" lista itens sem divergência.
- "recorrentes:" lista itens com divergência em 2 ou mais conferências: nome(vezes x, soma da divergência).
Todos os números já estão calculados. Não recalcule; use-os como estão.

TAREFA: analise as conferências com base nas datas e nas informações, incluindo as observações, e entregue:
1. RESUMO: 2 a 3 frases com o resultado de cada conferência.
2. PRINCIPAIS DIVERGÊNCIAS: maiores faltas e maiores sobras, com valores e unidade.
3. PADRÕES: itens recorrentes, evolução entre as datas, concentração por local.
4. OBSERVAÇÕES: o que os conferentes registraram e como pode se relacionar com as divergências.
5. RECOMENDAÇÕES: até 5 ações práticas e objetivas.

REGRAS: use somente os dados fornecidos. Não invente causas; ao supor, escreva "possível causa". Nunca some KG com UND. Com apenas uma conferência, não comente tendência. Responda em português do Brasil, em texto simples, sem markdown (sem #, ** ou tabelas): títulos em MAIÚSCULAS e listas com hífen. Máximo de 350 palavras.`

async function usuarioTemAcessoRota(usuarioId: string, path: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('sistema_usuario_rota')
    .select('rota:sistema_rotas(path)')
    .eq('usuario', usuarioId)

  if (error) {
    console.error('[gerar-analise] erro ao checar rota:', error.message)
    return false
  }
  return (data ?? []).some((row: any) => row.rota?.path === path)
}

// Gemini 2.5 Flash gasta tokens de saída "pensando" por padrão; budget 0 desliga isso.
function configThinking(model: string) {
  return /gemini-2\.5-flash/.test(model) ? { thinkingConfig: { thinkingBudget: 0 } } : {}
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor' })
  }

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Token ausente' })

  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Token inválido' })

  if (!(await usuarioTemAcessoRota(user.id, ROTA_CONFERENCIA))) {
    return res.status(403).json({ error: 'Sem acesso ao módulo de conferência' })
  }

  const dados = req.body?.dados
  if (typeof dados !== 'string' || !dados.trim()) {
    return res.status(400).json({ error: 'Dados da análise ausentes' })
  }
  if (dados.length > MAX_INPUT_CHARS) {
    return res.status(413).json({ error: 'Dados muito extensos para análise' })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25_000)

  try {
    const resposta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: [{ role: 'user', parts: [{ text: dados }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
            ...configThinking(GEMINI_MODEL),
          },
        }),
        signal: controller.signal,
      }
    )

    const json: any = await resposta.json().catch(() => ({}))

    if (resposta.status === 429) {
      return res.status(429).json({
        error: 'Limite de uso da API do Gemini atingido. Aguarde um pouco e tente novamente.',
      })
    }
    if (!resposta.ok) {
      const msg = json?.error?.message || `status ${resposta.status}`
      console.error('[gerar-analise] erro Gemini:', msg)
      return res.status(502).json({ error: `Erro na API do Gemini: ${msg}` })
    }

    const candidato = json?.candidates?.[0]
    let texto: string = (candidato?.content?.parts ?? [])
      .map((p: any) => p?.text)
      .filter(Boolean)
      .join('')
      .trim()

    if (!texto) {
      const motivo = json?.promptFeedback?.blockReason || candidato?.finishReason || 'desconhecido'
      return res.status(502).json({ error: `A IA não retornou texto (motivo: ${motivo}).` })
    }
    if (candidato?.finishReason === 'MAX_TOKENS') {
      texto += '\n\n(Resposta cortada pelo limite de tokens.)'
    }

    return res.status(200).json({ analise: texto, uso: json?.usageMetadata })
  } catch (err) {
    const abortou = err instanceof Error && err.name === 'AbortError'
    return res.status(abortou ? 504 : 502).json({
      error: abortou
        ? 'A IA demorou demais para responder. Tente novamente.'
        : 'Falha ao contatar a API do Gemini.',
    })
  } finally {
    clearTimeout(timeout)
  }
}