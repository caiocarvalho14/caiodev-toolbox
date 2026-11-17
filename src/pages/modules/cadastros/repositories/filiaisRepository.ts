// src/pages/modules/cadastros/repositories/filiaisRepository.ts
// Cadastro base (módulo Cadastros), usado pelos outros módulos.
import { createOfflineRepository } from '../../../../lib/sync/offlineRepository'
import type { Filial } from '../types/filial'

export const filiaisRepository = createOfflineRepository<Filial>('cad_filial')
