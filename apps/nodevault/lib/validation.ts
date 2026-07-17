import type { ZodType } from 'zod'

export type FormErrors = Record<string, string>

/** Validate form state against a contract schema, keyed by field path. */
export const zodValidate = <T>(schema: ZodType<T>) => (state: unknown): FormErrors => {
  const result = schema.safeParse(state)

  if (result.success) return {}

  const errors: FormErrors = {}

  for (const issue of result.error.issues) {
    const path = issue.path.join('.')

    errors[path] ??= issue.message
  }

  return errors
}
