// src/pages/modules/cadastros/repositories/locaisRepository.ts
// Cadastro base (módulo Cadastros), usado pelos outros módulos.
import { createOfflineRepository } from '../../../../lib/sync/offlineRepository'
import type { LocalContagem } from '../types/local'

export const locaisRepository = createOfflineRepository<LocalContagem>('cad_local')
