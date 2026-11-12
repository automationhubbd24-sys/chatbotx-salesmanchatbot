import "server-only"

import { facebookMarketingMessagesService } from "@salesmanchatbot.io/business"
import type { FacebookMarketingMessageModel } from "@salesmanchatbot.io/database/types"

export function listMarketingMessages(
  workspaceId: string,
): Promise<FacebookMarketingMessageModel[]> {
  return facebookMarketingMessagesService.list(workspaceId)
}
