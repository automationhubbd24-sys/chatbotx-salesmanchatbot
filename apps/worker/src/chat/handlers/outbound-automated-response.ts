import { replyByOutboundAutomatedResponse } from "@salesmanchatbot.io/automated-response"
import type { ChatJobCheckOutboundAutomatedResponse } from "@salesmanchatbot.io/worker-config"

export const checkOutboundAutomatedResponse = async (
  data: ChatJobCheckOutboundAutomatedResponse["data"],
): Promise<void> => {
  await replyByOutboundAutomatedResponse(data)
}
