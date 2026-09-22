// src/modules/conferencia/repositories/modelosRepository.ts
import { createOfflineRepository } from '../../../../lib/sync/offlineRepository'
import type { ModeloItem } from '../types/modelo'

export const modeloItensRepository = createOfflineRepository<ModeloItem>('conf_modelo_item')