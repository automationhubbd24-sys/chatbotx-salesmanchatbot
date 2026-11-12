import { z } from "zod"

const baseURL = z.string().trim().url().max(2048)
const embeddingModel = z.string().trim().min(1).max(255)

export const connectOpenaiCompatibleEmbeddingRequest = z.object({
  apiKey: z.string().trim().min(1),
  baseURL,
  embeddingModel,
  enabled: z.boolean().default(true),
})
export type ConnectOpenaiCompatibleEmbeddingRequest = z.infer<
  typeof connectOpenaiCompatibleEmbeddingRequest
>

export const updateOpenaiCompatibleEmbeddingRequest = z.object({
  apiKey: z.string().trim(),
  baseURL,
  embeddingModel,
  enabled: z.boolean().default(true),
})
export type UpdateOpenaiCompatibleEmbeddingRequest = z.infer<
  typeof updateOpenaiCompatibleEmbeddingRequest
>
