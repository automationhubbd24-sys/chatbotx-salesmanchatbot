import type { TrackingResponseType } from "@salesmanchatbot.io/analytics"

export interface BotResponseTrackingContext {
  aiProvider: string
  conversationId: string
  messageId: string
  responseType: TrackingResponseType
  startTime: number
  triggerType: string
  workspaceId: string
}
