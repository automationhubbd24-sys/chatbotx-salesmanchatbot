"use server"

import { conversationService } from "@salesmanchatbot.io/business"
import type { UserModel } from "@salesmanchatbot.io/database/types"
import {
  type WorkspaceIdRequestParams,
  workspaceIdrequestParams,
} from "@/features/common/schema"
import {
  type AssignConversationSchema,
  assignConversationSchema,
} from "@/features/conversations/schema/action"
import { workspaceActionClient } from "@/lib/safe-action"

export const assignConversationAction = workspaceActionClient
  .bindArgsSchemas(workspaceIdrequestParams)
  .inputSchema(assignConversationSchema)
  .action(
    async ({
      bindArgsParsedInputs: [workspaceId],
      parsedInput,
      ctx,
    }: {
      bindArgsParsedInputs: WorkspaceIdRequestParams
      parsedInput: AssignConversationSchema
      ctx: { user: UserModel }
    }) => {
      await conversationService.assignByContactIds({
        workspaceId,
        contactIds: parsedInput.contactIds,
        assignedId: parsedInput.assignedId,
        assignedBy: ctx.user.id,
        triggerContext: {
          triggerSource: "api",
          triggerHandler: "assignConversation",
        },
      })
    },
  )
