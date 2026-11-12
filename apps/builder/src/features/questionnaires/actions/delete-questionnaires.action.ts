"use server"

import { questionnaireService } from "@salesmanchatbot.io/business"
import {
  bulkUpdateIdsRequest,
  workspaceIdrequestParams,
} from "@/features/common/schema"
import { workspaceActionClient } from "@/lib/safe-action"

export const deleteQuestionnairesAction = workspaceActionClient
  .bindArgsSchemas(workspaceIdrequestParams)
  .inputSchema(bulkUpdateIdsRequest)
  .action(async ({ bindArgsParsedInputs: [workspaceId], parsedInput }) => {
    await questionnaireService.deleteMany({
      workspaceId,
      ids: parsedInput.ids,
    })
  })
