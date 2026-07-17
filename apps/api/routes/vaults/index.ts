import { execute, protectedProcedure, router } from '@platform/components.api'
import {
  createVaultRequestSchema,
  getVaultRequestSchema,
  listVaultsResponseSchema,
  vaultDtoSchema,
} from '@platform/components.contracts'
import { vaultCreate } from './create.js'
import { vaultGet } from './get.js'
import { vaultsList } from './list.js'

export const vaultsRouter = router({
  list: protectedProcedure
    .output(listVaultsResponseSchema)
    .query(execute(vaultsList)),

  get: protectedProcedure
    .input(getVaultRequestSchema)
    .output(vaultDtoSchema)
    .query(execute(vaultGet)),

  create: protectedProcedure
    .input(createVaultRequestSchema)
    .output(vaultDtoSchema)
    .mutation(execute(vaultCreate)),
})
