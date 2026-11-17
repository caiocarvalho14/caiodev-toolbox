// src/pages/modules/cadastros/repositories/marcasRepository.ts
// Cadastro base (módulo Cadastros), usado pelos outros módulos.
import { createOfflineRepository } from '../../../../lib/sync/offlineRepository'
import type { MarcaItem } from '../types/marca'

export const marcasRepository = createOfflineRepository<MarcaItem>('cad_marca')
