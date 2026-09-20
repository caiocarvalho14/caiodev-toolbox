// src/modules/conferencia/repositories/registrosRepository.ts
import { createOfflineRepository } from '../../../../lib/sync/offlineRepository'
import type { RegistroConferencia } from '../../../modules/conferencia/types/registro'

export const registrosRepository = createOfflineRepository<RegistroConferencia>('conf_registro')