import { execute, protectedProcedure, router } from '@platform/components.api'
import {
  gcpCredentialsStatusSchema, setGcpCredentialsRequestSchema, updateProfileRequestSchema, userDtoSchema,
} from '@platform/components.contracts'
import { accountUpdateProfile } from './update-profile.js'
import { accountGcpStatus } from './gcp-status.js'
import { accountSetGcpCredentials } from './set-gcp-credentials.js'

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
})
