"use server"

import { broadcastService } from "@salesmanchatbot.io/business"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { workspaceActionClient } from "@/lib/safe-action"

export const moveBroadcastToDraftAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .action(async (props) => {
    const {
      bindArgsParsedInputs: [workspaceId, id],
    } = props

    // The service owns the transition guard and the audit record — shared
    // with the public API's `moveToDraft` route.
    return await broadcastService.moveToDraft({
      workspaceId,
      broadcastId: id,
    })
  })
