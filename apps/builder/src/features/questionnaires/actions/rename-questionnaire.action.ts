"use server"

import { questionnaireService } from "@salesmanchatbot.io/business"
import { workspaceIdAndIdRequestParams } from "@/features/common/schema"
import { workspaceActionClient } from "@/lib/safe-action"
import { renameQuestionnaireRequest } from "../schema/action"

export const renameQuestionnaireAction = workspaceActionClient
  .bindArgsSchemas(workspaceIdAndIdRequestParams)
  .inputSchema(renameQuestionnaireRequest)
  .action(async ({ bindArgsParsedInputs: [workspaceId, id], parsedInput }) => {
    await questionnaireService.rename({
      workspaceId,
      id,
      name: parsedInput.name,
    })
  })
