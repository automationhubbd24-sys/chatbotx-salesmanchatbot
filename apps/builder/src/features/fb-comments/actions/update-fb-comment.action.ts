"use server"

import { commentAutomationService } from "@salesmanchatbot.io/business"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { workspaceActionClient } from "@/lib/safe-action"
import {
  type UpdateFbCommentRequest,
  updateFbCommentRequest,
} from "../schema/action"

export const updateFbCommentAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .inputSchema(updateFbCommentRequest)
  .action(
    async ({
      bindArgsParsedInputs: [workspaceId, id],
      parsedInput,
    }: {
      bindArgsParsedInputs: readonly [string, string]
      parsedInput: UpdateFbCommentRequest
    }) => {
      await commentAutomationService.updateMessenger(
        { workspaceId, id },
        parsedInput,
      )
    },
  )
