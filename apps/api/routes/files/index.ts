import { execute, protectedProcedure, router } from '@platform/components.api'
import {
  fileDtoSchema,
  listFilesRequestSchema,
  listFilesResponseSchema,
  uploadFileRequestSchema,
} from '@platform/components.contracts'
import { filesList } from './list.js'
import { filesUpload } from './upload.js'

export const filesRouter = router({
  list: protectedProcedure
    .input(listFilesRequestSchema)
    .output(listFilesResponseSchema)
    .query(execute(filesList)),

  upload: protectedProcedure
    .input(uploadFileRequestSchema)
    .output(fileDtoSchema)
    .mutation(execute(filesUpload)),
})
