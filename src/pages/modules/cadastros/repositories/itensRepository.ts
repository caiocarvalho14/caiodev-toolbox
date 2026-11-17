// src/pages/modules/cadastros/repositories/itensRepository.ts
// Cadastro base (módulo Cadastros), usado pelos outros módulos.
import { createOfflineRepository } from '../../../../lib/sync/offlineRepository'
import type { Item } from '../types/item'

export const itensRepository = createOfflineRepository<Item>('cad_item')
