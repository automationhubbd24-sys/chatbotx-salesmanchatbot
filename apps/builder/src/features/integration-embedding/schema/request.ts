import { z } from "zod"

const baseURLSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine((value) => {
    try {
      const parsed = new URL(value)
      return parsed.protocol === "http:" || parsed.protocol === "https:"
    } catch {
      return false
    }
  })

export const connectIntegrationEmbeddingSchema = z.object({
  apiKey: z.string().trim().min(1),
  baseURL: baseURLSchema,
  enabled: z.boolean().default(true),
  model: z.string().trim().min(1).max(255),
})
export type ConnectIntegrationEmbeddingSchema = z.infer<
  typeof connectIntegrationEmbeddingSchema
>

export const updateIntegrationEmbeddingSchema = connectIntegrationEmbeddingSchema
  .extend({
    apiKey: z.string().trim().optional(),
  })
  .partial()
export type UpdateIntegrationEmbeddingSchema = z.infer<
  typeof updateIntegrationEmbeddingSchema
>
