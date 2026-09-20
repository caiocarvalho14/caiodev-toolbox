// src/modules/conferencia/repositories/contagensRepository.ts
import { createOfflineRepository } from '../../../../lib/sync/offlineRepository'
import type { Contagem } from '../../../modules/conferencia/types/contagem'

export const contagensRepository = createOfflineRepository<Contagem>('conf_contagem')