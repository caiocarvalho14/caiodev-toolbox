// src/modules/conferencia/repositories/filiaisRepository.ts
import { createOfflineRepository } from '../../../../lib/sync/offlineRepository'
import type { Filial } from '../types/filial'

export const filiaisRepository = createOfflineRepository<Filial>('conf_filial')
