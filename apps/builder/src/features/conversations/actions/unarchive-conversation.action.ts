"use server"

import { conversationService } from "@salesmanchatbot.io/business"
import type { UserModel } from "@salesmanchatbot.io/database/types"
import {
  type BulkUpdateIdsRequest,
  bulkUpdateIdsRequest,
  type WorkspaceIdRequestParams,
  workspaceIdrequestParams,
} from "@/features/common/schema"
import { workspaceActionClient } from "@/lib/safe-action"

export const unarchiveConversationAction = workspaceActionClient
  .bindArgsSchemas(workspaceIdrequestParams)
  .inputSchema(bulkUpdateIdsRequest)
  .action(
    async ({
      bindArgsParsedInputs: [workspaceId],
      parsedInput,
      ctx,
    }: {
      bindArgsParsedInputs: WorkspaceIdRequestParams
      parsedInput: BulkUpdateIdsRequest
      ctx: { user: UserModel }
    }) => {
      await conversationService.unarchiveByIds({
        workspaceId,
        ids: parsedInput.ids,
        userId: ctx.user.id,
        triggerContext: {
          triggerSource: "api",
          triggerHandler: "unarchiveConversationAction",
          triggerType: "conversation_unarchived",
        },
      })
    },
  )
