"use server"

import {
  EMBEDDING_DIMENSIONS,
  integrationEmbeddingService,
  validateOpenaiCompatibleBaseUrlForEnvironment,
} from "@chatbotx.io/business"
import { ChatbotXException } from "@chatbotx.io/business/errors"
import { secretTextAuthSchema } from "@chatbotx.io/sdk"
import { getTranslations } from "next-intl/server"
import { returnValidationErrors } from "next-safe-action"
import {
  type WorkspaceIdRequestParams,
  workspaceIdrequestParams,
} from "@/features/common/schema"
import { verifyOpenaiCompatibleProvider } from "@/features/integration-openai-compatible/lib"
import { workspaceActionClient } from "@/lib/safe-action"
import {
  type UpdateIntegrationEmbeddingSchema,
  updateIntegrationEmbeddingSchema,
} from "../schema/request"
import { validateEmbeddingProvider } from "./validate"

export const updateIntegrationEmbeddingAction = workspaceActionClient
  .bindArgsSchemas(workspaceIdrequestParams)
  .inputSchema(updateIntegrationEmbeddingSchema)
  .action(
    async ({
      parsedInput,
      bindArgsParsedInputs: [workspaceId],
    }: {
      parsedInput: UpdateIntegrationEmbeddingSchema
      bindArgsParsedInputs: WorkspaceIdRequestParams
    }) => {
      const t = await getTranslations()
      const apiKey = parsedInput.apiKey?.trim()
      let baseURL = parsedInput.baseURL
      const shouldValidateProvider = Boolean(
        apiKey || parsedInput.baseURL || parsedInput.model,
      )
      const existing = shouldValidateProvider
        ? await integrationEmbeddingService.findByWorkspaceId(workspaceId)
        : undefined

      if (shouldValidateProvider) {
        try {
          baseURL = await validateOpenaiCompatibleBaseUrlForEnvironment(
            baseURL ?? existing?.baseURL ?? "",
          )
        } catch (error) {
          if (isBaseUrlValidationError(error)) {
            return returnValidationErrors(updateIntegrationEmbeddingSchema, {
              baseURL: {
                _errors: [t("embedding.validation.invalidBaseURL")],
              },
            })
          }
          throw error
        }
        const existingAuth = secretTextAuthSchema.safeParse(existing?.auth)
        const verifyResult = await verifyOpenaiCompatibleProvider({
          apiKey:
            apiKey ||
            (existingAuth.success ? existingAuth.data.secretText : undefined),
          baseURL,
        })

        if (!verifyResult.ok) {
          if (verifyResult.reason === "unsafe_base_url") {
            return returnValidationErrors(updateIntegrationEmbeddingSchema, {
              baseURL: {
                _errors: [t("embedding.validation.invalidBaseURL")],
              },
            })
          }
          return returnValidationErrors(updateIntegrationEmbeddingSchema, {
            apiKey: {
              _errors: [t("validation.invalidApiKey")],
            },
          })
        }

        try {
          const embeddingResult = await validateEmbeddingProvider({
            apiKey,
            auth: existing?.auth,
            baseURL: baseURL ?? existing?.baseURL ?? "",
            model: parsedInput.model ?? existing?.model ?? "",
          })
          if (!embeddingResult.validDimensions) {
            return returnValidationErrors(updateIntegrationEmbeddingSchema, {
              model: {
                _errors: [
                  t("embedding.validation.dimensionMismatch", {
                    actual: embeddingResult.dimensions,
                    expected: EMBEDDING_DIMENSIONS,
                  }),
                ],
              },
            })
          }
        } catch {
          return returnValidationErrors(updateIntegrationEmbeddingSchema, {
            model: {
              _errors: [t("embedding.test.failed")],
            },
          })
        }
      }

      try {
        await integrationEmbeddingService.update(workspaceId, {
          ...parsedInput,
          ...(baseURL === undefined ? {} : { baseURL }),
          ...(apiKey ? { apiKey } : { apiKey: undefined }),
        })
      } catch (error) {
        if (isBaseUrlValidationError(error)) {
          return returnValidationErrors(updateIntegrationEmbeddingSchema, {
            baseURL: {
              _errors: [t("embedding.validation.invalidBaseURL")],
            },
          })
        }
        throw error
      }
    },
  )

const isBaseUrlValidationError = (error: unknown): error is ChatbotXException =>
  error instanceof ChatbotXException &&
  (error.code === "invalidBaseUrl" || error.code === "ssrfBlocked")
