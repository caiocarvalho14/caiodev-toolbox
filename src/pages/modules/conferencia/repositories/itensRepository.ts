// src/modules/conferencia/repositories/itensRepository.ts
import { createOfflineRepository } from '../../../../lib/sync/offlineRepository'
import type { Item } from '../../../modules/conferencia/types/item'

export const itensRepository = createOfflineRepository<Item>('conf_item')