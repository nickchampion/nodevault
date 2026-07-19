import { execute, protectedProcedure, router } from '@platform/components.api'
import {
  gcpCredentialsStatusSchema, openaiCredentialsStatusSchema, setGcpCredentialsRequestSchema, setOpenAiKeyRequestSchema,
  updateProfileRequestSchema, userDtoSchema,
} from '@platform/components.nodevault.contracts'
import { accountUpdateProfile } from './update-profile.js'
import { accountGcpStatus } from './gcp-status.js'
import { accountOpenaiStatus } from './openai-status.js'
import { accountSetGcpCredentials } from './set-gcp-credentials.js'
import { accountSetOpenAiKey } from './set-openai-key.js'

export const accountRouter = router({
  updateProfile: protectedProcedure
    .input(updateProfileRequestSchema)
    .output(userDtoSchema)
    .mutation(execute(accountUpdateProfile)),

  gcpStatus: protectedProcedure
    .output(gcpCredentialsStatusSchema)
    .query(execute(accountGcpStatus)),

  setGcpCredentials: protectedProcedure
    .input(setGcpCredentialsRequestSchema)
    .output(gcpCredentialsStatusSchema)
    .mutation(execute(accountSetGcpCredentials)),

  openaiStatus: protectedProcedure
    .output(openaiCredentialsStatusSchema)
    .query(execute(accountOpenaiStatus)),

  setOpenAiKey: protectedProcedure
    .input(setOpenAiKeyRequestSchema)
    .output(openaiCredentialsStatusSchema)
    .mutation(execute(accountSetOpenAiKey)),
})
