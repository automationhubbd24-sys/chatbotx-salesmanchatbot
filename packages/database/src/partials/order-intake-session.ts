import z from "zod"

export const orderConversationSessionStates = z.enum([
  "collecting",
  "draft_created",
  "completed",
  "abandoned",
  "expired",
])
export type OrderConversationSessionState = z.infer<
  typeof orderConversationSessionStates
>
