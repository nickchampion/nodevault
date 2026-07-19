import { z } from 'zod'

export const assetSourceSchema = z.enum(['file', 'url'])
export const assetStatusSchema = z.enum(['pending', 'processing', 'ready', 'failed'])

export type AssetSource = z.infer<typeof assetSourceSchema>
export type AssetStatus = z.infer<typeof assetStatusSchema>

export const deleteAssetRequestSchema = z.object({
  vaultId: z.int().positive(),
  assetId: z.int().positive(),
})

export type DeleteAssetRequest = z.infer<typeof deleteAssetRequestSchema>

export const listAssetsRequestSchema = z.object({
  vaultId: z.int().positive(),
  source: assetSourceSchema,
  page: z.int().positive().default(1),
  pageSize: z.int().positive().max(100).default(10),
})

export type ListAssetsRequest = z.infer<typeof listAssetsRequestSchema>

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

export const uploadFileAssetRequestSchema = z.object({
  vaultId: z.int().positive(),
  name: z.string().trim().min(1, 'File name is required').max(255),
  contentType: supportedContentTypeSchema,
  content: z.base64().min(1, 'File is empty').max(maxUploadChars, 'File must be 10MB or smaller'),
})

export type UploadFileAssetRequest = z.infer<typeof uploadFileAssetRequestSchema>

export const submitUrlAssetRequestSchema = z.object({
  vaultId: z.int().positive(),
  url: z.url(),
})

export type SubmitUrlAssetRequest = z.infer<typeof submitUrlAssetRequestSchema>

export const assetFileUploadedEventSchema = z.object({
  assetId: z.int().positive(),
})

export type AssetFileUploadedEvent = z.infer<typeof assetFileUploadedEventSchema>

export const assetUrlSubmittedEventSchema = z.object({
  assetId: z.int().positive(),
})

export type AssetUrlSubmittedEvent = z.infer<typeof assetUrlSubmittedEventSchema>

export const assetDtoSchema = z.object({
  id: z.int().positive(),
  source: assetSourceSchema,
  name: z.string().nullable(),
  url: z.string().nullable(),
  contentType: z.string().nullable(),
  sizeBytes: z.int().nonnegative().nullable(),
  status: assetStatusSchema,
  error: z.string().nullable(),
  createdAtUTC: z.iso.datetime(),
})

export const downloadAssetRequestSchema = z.object({
  vaultId: z.int().positive(),
  assetId: z.int().positive(),
})

export type DownloadAssetRequest = z.infer<typeof downloadAssetRequestSchema>

export const downloadAssetResponseSchema = z.object({
  name: z.string(),
  contentType: z.string().nullable(),
  content: z.base64(),
})

export type DownloadAssetResponse = z.infer<typeof downloadAssetResponseSchema>

export const listAssetsResponseSchema = z.object({
  assets: z.array(assetDtoSchema),
  total: z.int().nonnegative(),
  page: z.int().positive(),
  pageSize: z.int().positive(),
})

export type AssetDto = z.infer<typeof assetDtoSchema>
export type ListAssetsResponse = z.infer<typeof listAssetsResponseSchema>
