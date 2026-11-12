import { customAuthSchema } from "@salesmanchatbot.io/sdk"
import { z } from "zod"

export const salesmanchatbotAuthSchema = customAuthSchema.extend({
  appUrl: z.url(),
  wsUrl: z.url(),
  apiKey: z.string().trim().min(1),
})
export type ChatbotxAuthValue = z.infer<typeof salesmanchatbotAuthSchema>
