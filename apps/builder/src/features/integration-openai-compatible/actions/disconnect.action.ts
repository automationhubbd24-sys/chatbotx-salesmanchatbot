"use server"

import { integrationOpenaiCompatibleService } from "@salesmanchatbot.io/business"
import {
  type WorkspaceIdAndIdRequestParams,
  workspaceIdAndIdRequestParams,
} from "@/features/common/schema"
import { workspaceActionClient } from "@/lib/safe-action"

export const disconnectOpenaiCompatibleAction = workspaceActionClient
  .bindArgsSchemas(workspaceIdAndIdRequestParams)
  .action(
    async ({
      bindArgsParsedInputs: [workspaceId, integrationId],
    }: {
      bindArgsParsedInputs: WorkspaceIdAndIdRequestParams
    }) => {
      await integrationOpenaiCompatibleService.disconnect(
        workspaceId,
        integrationId,
      )
    },
  )
