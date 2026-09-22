// src/modules/conferencia/repositories/modelosRepository.ts
import { createOfflineRepository } from '../../../../lib/sync/offlineRepository'
import type { ModeloConferencia } from '../types/modelo'

export const modelosRepository = createOfflineRepository<ModeloConferencia>('conf_modelo')