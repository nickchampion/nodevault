import { z } from 'zod'

export const fileSourceSchema = z.enum(['upload', 'url'])
export const fileStatusSchema = z.enum(['pending', 'processing', 'ready', 'failed'])

export type FileSource = z.infer<typeof fileSourceSchema>
export type FileStatus = z.infer<typeof fileStatusSchema>

export const listFilesRequestSchema = z.object({
  vaultId: z.int().positive(),
  source: fileSourceSchema,
  page: z.int().positive().default(1),
  pageSize: z.int().positive().max(100).default(10),
})

export type ListFilesRequest = z.infer<typeof listFilesRequestSchema>

export const supportedContentTypes = [
  'text/plain',
  'text/markdown',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

export const supportedContentTypeSchema = z.enum(supportedContentTypes, {
  error: 'Unsupported file type — supported: .txt, .md, .pdf, .docx',
})

export type SupportedContentType = z.infer<typeof supportedContentTypeSchema>

const contentTypesByExtension: Record<string, SupportedContentType> = {
  txt: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

/**
 * Resolve the supported content type from a file name's extension. Extension-first is
 * deliberate: browsers report types like text/markdown inconsistently (often empty).
 */
export const contentTypeForFileName = (name: string): SupportedContentType | null => {
  const extension = name.split('.').pop()?.toLowerCase() ?? ''

  return contentTypesByExtension[extension] ?? null
}

export const maxUploadBytes = 10 * 1024 * 1024

// base64 inflates by 4/3 — allow enough characters to carry maxUploadBytes of binary
const maxUploadChars = Math.ceil(maxUploadBytes / 3) * 4

export const uploadFileRequestSchema = z.object({
  vaultId: z.int().positive(),
  name: z.string().trim().min(1, 'File name is required').max(255),
  contentType: supportedContentTypeSchema,
  content: z.base64().min(1, 'File is empty').max(maxUploadChars, 'File must be 10MB or smaller'),
})

export type UploadFileRequest = z.infer<typeof uploadFileRequestSchema>

export const fileUploadedEventSchema = z.object({
  fileId: z.int().positive(),
})

export type FileUploadedEvent = z.infer<typeof fileUploadedEventSchema>

export const fileDtoSchema = z.object({
  id: z.int().positive(),
  source: fileSourceSchema,
  name: z.string().nullable(),
  url: z.string().nullable(),
  contentType: z.string().nullable(),
  sizeBytes: z.int().nonnegative().nullable(),
  status: fileStatusSchema,
  error: z.string().nullable(),
  createdAtUTC: z.iso.datetime(),
})

export const listFilesResponseSchema = z.object({
  files: z.array(fileDtoSchema),
  total: z.int().nonnegative(),
  page: z.int().positive(),
  pageSize: z.int().positive(),
})

export type FileDto = z.infer<typeof fileDtoSchema>
export type ListFilesResponse = z.infer<typeof listFilesResponseSchema>
