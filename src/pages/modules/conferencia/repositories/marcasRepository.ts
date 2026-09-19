// src/modules/conferencia/repositories/marcasRepository.ts
import { createOfflineRepository } from '../../../../lib/sync/offlineRepository'
import type { MarcaItem } from '../types/Marcas'

export const marcasRepository = createOfflineRepository<MarcaItem>('conf_marca_item')