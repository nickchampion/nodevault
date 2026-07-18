import { z } from 'zod'

export const createVaultRequestSchema = z.object({
  name: z.string().trim()
    .min(2, 'Vault name must be at least 2 characters')
    .max(50, 'Vault name must be 50 characters or fewer'),
})

export type CreateVaultRequest = z.infer<typeof createVaultRequestSchema>

export const getVaultRequestSchema = z.object({
  vaultId: z.int().positive(),
})

export type GetVaultRequest = z.infer<typeof getVaultRequestSchema>

export const deleteVaultRequestSchema = z.object({
  vaultId: z.int().positive(),
})

export type DeleteVaultRequest = z.infer<typeof deleteVaultRequestSchema>

export const vaultDtoSchema = z.object({
  id: z.int().positive(),
  name: z.string(),
  documentCount: z.int().nonnegative(),
  urlCount: z.int().nonnegative(),
  createdAtUTC: z.iso.datetime(),
})

export const listVaultsResponseSchema = z.object({
  vaults: z.array(vaultDtoSchema),
})

export type VaultDto = z.infer<typeof vaultDtoSchema>
export type ListVaultsResponse = z.infer<typeof listVaultsResponseSchema>
