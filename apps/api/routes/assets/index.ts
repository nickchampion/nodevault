import { execute, protectedProcedure, router } from '@platform/components.api'
import {
  assetDtoSchema,
  deleteAssetRequestSchema,
  listAssetsRequestSchema,
  listAssetsResponseSchema,
  okResponseSchema,
  searchVaultRequestSchema,
  searchVaultResponseSchema,
  submitUrlAssetRequestSchema,
  uploadFileAssetRequestSchema,
} from '@platform/components.contracts'
import { assetsDelete } from './delete.js'
import { assetsList } from './list.js'
import { assetsSearch } from './search.js'
import { assetsSubmitUrl } from './submit-url.js'
import { assetsUpload } from './upload.js'

export const assetsRouter = router({
  list: protectedProcedure
    .input(listAssetsRequestSchema)
    .output(listAssetsResponseSchema)
    .query(execute(assetsList)),

  delete: protectedProcedure
    .input(deleteAssetRequestSchema)
    .output(okResponseSchema)
    .mutation(execute(assetsDelete)),

  upload: protectedProcedure
    .input(uploadFileAssetRequestSchema)
    .output(assetDtoSchema)
    .mutation(execute(assetsUpload)),

  submitUrl: protectedProcedure
    .input(submitUrlAssetRequestSchema)
    .output(assetDtoSchema)
    .mutation(execute(assetsSubmitUrl)),

  search: protectedProcedure
    .input(searchVaultRequestSchema)
    .output(searchVaultResponseSchema)
    .query(execute(assetsSearch)),
})
