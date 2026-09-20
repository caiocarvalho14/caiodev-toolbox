// src/modules/conferencia/repositories/conferenciasRepository.ts
import { createOfflineRepository } from '../../../../lib/sync/offlineRepository'
import type { Conferencia } from '../../../modules/conferencia/types/Conferencia'

export const conferenciasRepository = createOfflineRepository<Conferencia>('conf_conferencia')