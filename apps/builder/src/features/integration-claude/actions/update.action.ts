"use server"

import { aiProviders } from "@salesmanchatbot.io/ai"
import { aiIntegrationService } from "@salesmanchatbot.io/ai/server"
import { integrationClaudeService } from "@salesmanchatbot.io/business"
import {
  type WorkspaceIdRequestParams,
  workspaceIdrequestParams,
} from "@/features/common/schema"
import { workspaceActionClient } from "@/lib/safe-action"
import {
  type UpdateClaudeRequest,
  updateClaudeRequest,
} from "../schema/request"

export const updateIntegrationClaudeAction = workspaceActionClient
  .bindArgsSchemas(workspaceIdrequestParams)
  .inputSchema(updateClaudeRequest)
  .action(
    async ({
      parsedInput,
      bindArgsParsedInputs: [workspaceId],
    }: {
      parsedInput: UpdateClaudeRequest
      bindArgsParsedInputs: WorkspaceIdRequestParams
    }) => {
      await integrationClaudeService.update({ workspaceId }, parsedInput)

      await aiIntegrationService.invalidateCache(
        workspaceId,
        aiProviders.enum.claude,
      )
    },
  )
