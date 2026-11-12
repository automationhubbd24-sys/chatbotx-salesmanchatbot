import { botMessageAnalyticsService } from "@salesmanchatbot.io/analytics"
import type { MessageBotReceivedEventPayload } from "@salesmanchatbot.io/event-bus"

export function handleMessageBotReceived(
  payloads: MessageBotReceivedEventPayload[],
): Promise<void> {
  return botMessageAnalyticsService.recordEvents(payloads)
}
