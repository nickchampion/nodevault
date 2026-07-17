import { execute, protectedProcedure, router } from '@platform/components.api'
import { updateProfileRequestSchema, userDtoSchema } from '@platform/components.contracts'
import { accountUpdateProfile } from './update-profile.js'

export const accountRouter = router({
  updateProfile: protectedProcedure
    .input(updateProfileRequestSchema)
    .output(userDtoSchema)
    .mutation(execute(accountUpdateProfile)),
})
