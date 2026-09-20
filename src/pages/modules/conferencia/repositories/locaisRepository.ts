// src/modules/conferencia/repositories/locaisRepository.ts
import { createOfflineRepository } from '../../../../lib/sync/offlineRepository'
import type { LocalContagem } from '../../../modules/conferencia/types/localContagem'

export const locaisRepository = createOfflineRepository<LocalContagem>('conf_local_contagem')