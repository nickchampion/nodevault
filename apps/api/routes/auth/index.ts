import { execute, publicProcedure, router } from '@platform/components.api'
import {
  loginRequestSchema,
  okResponseSchema,
  registerRequestSchema,
  verifyLoginResponseSchema,
  verifyRequestSchema,
} from '@platform/components.contracts'
import { authLogin } from './login.js'
import { authRegister } from './register.js'
import { authVerify } from './verify.js'

export const authRouter = router({
  login: publicProcedure
    .input(loginRequestSchema)
    .output(okResponseSchema)
    .mutation(execute(authLogin)),

  verify: publicProcedure
    .input(verifyRequestSchema)
    .output(verifyLoginResponseSchema)
    .mutation(execute(authVerify)),

  register: publicProcedure
    .input(registerRequestSchema)
    .output(verifyLoginResponseSchema)
    .mutation(execute(authRegister)),
})
