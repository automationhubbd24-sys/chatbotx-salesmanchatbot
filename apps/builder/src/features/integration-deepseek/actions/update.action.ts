"use server"

import { aiProviders } from "@salesmanchatbot.io/ai"
import { aiIntegrationService } from "@salesmanchatbot.io/ai/server"
import { integrationDeepSeekService } from "@salesmanchatbot.io/business"
import {
  type WorkspaceIdRequestParams,
  workspaceIdrequestParams,
} from "@/features/common/schema"
import { workspaceActionClient } from "@/lib/safe-action"
import {
  type UpdateDeepSeekRequest,
  updateDeepSeekRequest,
} from "../schema/request"

export const updateIntegrationDeepSeekAction = workspaceActionClient
  .bindArgsSchemas(workspaceIdrequestParams)
  .inputSchema(updateDeepSeekRequest)
  .action(
    async ({
      parsedInput,
      bindArgsParsedInputs: [workspaceId],
    }: {
      parsedInput: UpdateDeepSeekRequest
      bindArgsParsedInputs: WorkspaceIdRequestParams
    }) => {
      await integrationDeepSeekService.update({ workspaceId }, parsedInput)

      await aiIntegrationService.invalidateCache(
        workspaceId,
        aiProviders.enum.deepseek,
      )
    },
  )
