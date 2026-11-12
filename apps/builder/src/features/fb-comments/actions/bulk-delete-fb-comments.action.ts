"use server"

import { commentAutomationService } from "@salesmanchatbot.io/business"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { z } from "zod"
import {
  type WorkspaceIdRequestParams,
  workspaceIdrequestParams,
} from "@/features/common/schema"
import { workspaceActionClient } from "@/lib/safe-action"

export const bulkDeleteFbCommentsAction = workspaceActionClient
  .bindArgsSchemas(workspaceIdrequestParams)
  .inputSchema(z.object({ ids: z.array(zodBigintAsString()) }))
  .action(
    async ({
      bindArgsParsedInputs: [workspaceId],
      parsedInput,
    }: {
      bindArgsParsedInputs: WorkspaceIdRequestParams
      parsedInput: { ids: string[] }
    }) => {
      await commentAutomationService.deleteMany({
        workspaceId,
        ids: parsedInput.ids,
        types: ["messenger"],
      })
    },
  )
