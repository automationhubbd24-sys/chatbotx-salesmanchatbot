"use server"
import { aiProviders } from "@salesmanchatbot.io/ai"
import { aiIntegrationService } from "@salesmanchatbot.io/ai/server"
import { integrationGeminiService } from "@salesmanchatbot.io/business"
import { verifyAiProviderApiKey } from "@salesmanchatbot.io/business/integration-ai-provider/verify"
import { getTranslations } from "next-intl/server"
import { returnValidationErrors } from "next-safe-action"
import {
  type WorkspaceIdRequestParams,
  workspaceIdrequestParams,
} from "@/features/common/schema"
import { workspaceActionClient } from "@/lib/safe-action"
import {
  type ConnectGeminiRequest,
  connectGeminiRequest,
} from "../schema/request"

export const connectGeminiAction = workspaceActionClient
  .bindArgsSchemas(workspaceIdrequestParams)
  .inputSchema(connectGeminiRequest)
  .action(
    async ({
      parsedInput,
      bindArgsParsedInputs: [workspaceId],
    }: {
      parsedInput: ConnectGeminiRequest
      bindArgsParsedInputs: WorkspaceIdRequestParams
    }) => {
      const t = await getTranslations()

      if (
        (await verifyAiProviderApiKey(
          aiProviders.enum.gemini,
          parsedInput.apiKey,
        )) === "invalid"
      ) {
        return returnValidationErrors(connectGeminiRequest, {
          apiKey: {
            _errors: [t("validation.invalidApiKey")],
          },
        })
      }

      await integrationGeminiService.connect({
        workspaceId,
        apiKey: parsedInput.apiKey,
        model: parsedInput.model,
        temperature: parsedInput.temperature,
        maxOutputTokens: parsedInput.maxOutputTokens,
      })

      await aiIntegrationService.invalidateCache(
        workspaceId,
        aiProviders.enum.gemini,
      )

      return
    },
  )
