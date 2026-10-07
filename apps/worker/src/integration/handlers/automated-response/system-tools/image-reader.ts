import { createHash } from "node:crypto"
import type { systemFunctionNames } from "@chatbotx.io/ai"
import type {
  ImageReaderInput,
  SystemToolExecutors,
} from "@chatbotx.io/ai/server"
import type { AIAgentModelConfig } from "@chatbotx.io/database/partials"
import type { AttachmentModel } from "@chatbotx.io/database/types"
import {
  getHeavyJobCompletionWaitTimeoutMs,
  getHeavyJobOptions,
  getHeavyQueueEvents,
  HeavyJobAction,
  heavyAnalyzeImageResultSchema,
  heavyQueue,
  waitForJobCompletionWithRetries,
} from "@chatbotx.io/worker-config"
import pLimit from "p-limit"
import { normalizeError } from "universal-error-normalizer"
import { env } from "../../../../env"
import { getProviderName } from "../../../../lib/ai/reply-model"
import { logger } from "../../../../lib/logger"
import { resolveImageAttachment } from "./context-sources/image-source"

const IMAGE_READER_BATCH_CONCURRENCY = 3
const IMAGE_READER_MAX_BATCH_SIZE = 6

function getReadableImageTitle(attachment: AttachmentModel): string {
  return attachment.name?.trim() || "User uploaded image"
}

function hash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 32)
}

function stableJson(input: unknown): string {
  if (Array.isArray(input)) {
    return `[${input.map((value) => stableJson(value)).join(",")}]`
  }

  if (input && typeof input === "object") {
    const entries = Object.entries(input).sort(([left], [right]) =>
      left.localeCompare(right),
    )
    return `{${entries
      .map(([key, value]) => `${JSON.stringify(key)}:${stableJson(value)}`)
      .join(",")}}`
  }

  return JSON.stringify(input)
}

function buildImageReaderJobId(input: {
  attachmentId: string
  conversationId: string
  prompt: string
  providerInfo: AIAgentModelConfig
}): string {
  return `heavy-image-reader-${input.conversationId}-${input.attachmentId}-${hash(
    stableJson({
      prompt: input.prompt,
      providerInfo: input.providerInfo,
    }),
  )}`
}

function buildVisionPrompt(props: {
  attachment: AttachmentModel
  fileOnlyTrigger: boolean
  input: ImageReaderInput
  ordinal?: { current: number; total: number }
}): string {
  const query = props.input.query.trim() || "Describe this image."
  const lines = [
    "Analyze the uploaded image for a customer support conversation.",
    "Answer only from visible image content. If a requested detail is not visible, say that it is not visible.",
    "Return concise natural language. Do not return JSON or markdown tables.",
  ]

  if (props.ordinal) {
    lines.push(`Batch context: Image ${props.ordinal.current} of ${props.ordinal.total}.`)
  }

  lines.push(`User question: ${query}`)

  if (props.input.imageContext?.trim()) {
    lines.push(`Image selection context: ${props.input.imageContext.trim()}`)
  }

  lines.push(`Image title: ${getReadableImageTitle(props.attachment)}`)

  if (props.fileOnlyTrigger) {
    lines.push(
      "If the user did not ask a specific question, provide a short summary and suggest what detail they can ask about next.",
    )
  }

  return lines.join("\n")
}

function formatToolOutput(props: {
  analyses: Array<{
    analysis: string
    attachment: AttachmentModel
    ordinal: number | undefined
  }>
  fileOnlyTrigger: boolean
  isBatch: boolean
}) {
  const output: string[] = []

  for (const result of props.analyses) {
    const label = props.isBatch ? `Image ${result.ordinal}` : "Image"
    output.push(`${label}: ${getReadableImageTitle(result.attachment)}`)
    output.push(`Analysis: ${result.analysis}`)
  }

  if (props.fileOnlyTrigger) {
    output.push(
      "Follow-up: Ask the user what specific detail in the image they want to know more about.",
    )
  }

  return output.join("\n")
}

async function analyzeAttachment(input: {
  attachment: AttachmentModel
  context: NonNullable<Parameters<NonNullable<SystemToolExecutors[typeof systemFunctionNames.imageReader]>>[1]>
  fileOnlyTrigger: boolean
  input: ImageReaderInput
  ordinal?: { current: number; total: number }
  providerInfo: AIAgentModelConfig
}): Promise<string | null> {
  const prompt = buildVisionPrompt({
    attachment: input.attachment,
    fileOnlyTrigger: input.fileOnlyTrigger,
    input: input.input,
    ordinal: input.ordinal,
  })
  const job = await heavyQueue.add(
    HeavyJobAction.analyzeImage,
    {
      type: HeavyJobAction.analyzeImage,
      data: {
        workspaceId: input.context.workspaceId,
        originPath: input.attachment.originPath,
        mimeType: input.attachment.mimeType,
        sizeBytes: input.attachment.size,
        prompt,
        providerInfo: input.providerInfo,
      },
    },
    {
      ...getHeavyJobOptions(HeavyJobAction.analyzeImage),
      jobId: buildImageReaderJobId({
        attachmentId: input.attachment.id,
        conversationId: input.context.conversationId,
        prompt,
        providerInfo: input.providerInfo,
      }),
    },
  )

  if (!(job && typeof job === "object" && "waitUntilFinished" in job)) {
    throw new Error("Heavy queue did not return a waitable image job")
  }

  const rawResult = await waitForJobCompletionWithRetries(
    job,
    heavyQueue,
    getHeavyQueueEvents(),
    getHeavyJobCompletionWaitTimeoutMs(
      HeavyJobAction.analyzeImage,
      env.HEAVY_JOB_WAIT_TIMEOUT_MS,
    ),
  )
  const result = heavyAnalyzeImageResultSchema.parse(rawResult)
  return result.analysis.trim() || null
}

export function createImageReaderExecutor(options: {
  abortSignal?: AbortSignal
  fileOnlyTrigger: boolean
  modelId: string
  providerInfo: AIAgentModelConfig
  triggerMessageId?: string
}): NonNullable<SystemToolExecutors[typeof systemFunctionNames.imageReader]> {
  return async (args, context) => {
    if (!context) {
      return "I can only read images when conversation context is available."
    }

    try {
      const resolution = await resolveImageAttachment({
        workspaceId: context.workspaceId,
        conversationId: context.conversationId,
        messageId: options.triggerMessageId,
        query: args.query,
        sourceHint: args.imageContext,
      })

      if (resolution.status === "not_found") {
        return "I couldn't find a supported image in this conversation yet."
      }

      if (resolution.status === "ambiguous") {
        return `I found ${resolution.candidateCount} supported images in this conversation. Ask the user which image they mean before analyzing one.`
      }

      const attachments =
        resolution.status === "selected_batch"
          ? resolution.attachments
          : [resolution.attachment]

      if (attachments.length > IMAGE_READER_MAX_BATCH_SIZE) {
        return `I found ${attachments.length} images in the triggering message. Please send no more than ${IMAGE_READER_MAX_BATCH_SIZE} images at a time or ask about a smaller set.`
      }

      const limit = pLimit(IMAGE_READER_BATCH_CONCURRENCY)
      const results = await Promise.all(
        attachments.map((attachment, index) =>
          limit(async () => {
            try {
              const analysis = await analyzeAttachment({
                attachment,
                context,
                fileOnlyTrigger: options.fileOnlyTrigger,
                input: args,
                ordinal:
                  attachments.length > 1
                    ? { current: index + 1, total: attachments.length }
                    : undefined,
                providerInfo: options.providerInfo,
              })
              return analysis
                ? {
                    analysis,
                    attachment,
                    ordinal: attachments.length > 1 ? index + 1 : undefined,
                  }
                : null
            } catch (error) {
              const normalizedError = normalizeError(error)
              logger.error(
                {
                  err: normalizedError,
                  conversationId: context.conversationId,
                  workspaceId: context.workspaceId,
                  provider: getProviderName(options.providerInfo),
                  modelId: options.modelId,
                },
                "[image-reader] image analysis failed",
              )
              return null
            }
          }),
        ),
      )
      const successfulResults = results.filter(
        (
          result,
        ): result is {
          analysis: string
          attachment: AttachmentModel
          ordinal: number | undefined
        } => result !== null,
      )

      if (successfulResults.length === 0) {
        return "I found your image, but I couldn't analyze it completely. Please ask a more specific question or try another image."
      }

      return formatToolOutput({
        analyses: successfulResults,
        fileOnlyTrigger: options.fileOnlyTrigger,
        isBatch: attachments.length > 1,
      })
    } catch (error) {
      const normalizedError = normalizeError(error)
      logger.error(
        {
          err: normalizedError,
          conversationId: context.conversationId,
          workspaceId: context.workspaceId,
          provider: getProviderName(options.providerInfo),
          modelId: options.modelId,
        },
        "[image-reader] image tool execution failed",
      )

      return "I found your image, but I couldn't analyze it completely. Please ask a more specific question or try another image."
    }
  }
}
