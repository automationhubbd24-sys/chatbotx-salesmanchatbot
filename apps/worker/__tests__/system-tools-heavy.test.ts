import { beforeEach, describe, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getContextSourceAdapter: vi.fn(),
  heavyQueueAdd: vi.fn(),
  resolveImageAttachment: vi.fn(),
  findAttachmentVisionAnalysis: vi.fn(),
  saveAttachmentVisionAnalysis: vi.fn(),
}))

vi.mock("@chatbotx.io/worker-config", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@chatbotx.io/worker-config")>()
  return {
    ...actual,
    getHeavyQueueEvents: vi.fn(() => ({})),
    heavyQueue: { add: mocks.heavyQueueAdd },
  }
})

vi.mock("@chatbotx.io/business", () => ({
  attachmentVisionAnalysisService: {
    find: mocks.findAttachmentVisionAnalysis,
    save: mocks.saveAttachmentVisionAnalysis,
  },
}))

vi.mock("../src/env", () => ({
  env: { HEAVY_JOB_WAIT_TIMEOUT_MS: 120_000 },
}))

vi.mock("../src/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock(
  "../src/integration/handlers/automated-response/system-tools/context-sources/registry",
  () => ({
    getContextSourceAdapter: mocks.getContextSourceAdapter,
  }),
)

vi.mock(
  "../src/integration/handlers/automated-response/system-tools/context-sources/image-source",
  () => ({
    resolveImageAttachment: mocks.resolveImageAttachment,
  }),
)

const { createDocumentReaderExecutor } = await import(
  "../src/integration/handlers/automated-response/system-tools/document-reader"
)
const { createImageReaderExecutor } = await import(
  "../src/integration/handlers/automated-response/system-tools/image-reader"
)

const toolContext = {
  workspaceId: "workspace-1",
  conversationId: "conversation-1",
  contactId: "contact-1",
}

const documentReaderJobIdRegex = /^heavy-document-reader-conversation-1-/
const imageReaderJobIdRegex = /^heavy-image-reader-conversation-1-/

const providerInfo = {
  kind: "openaiCompatible" as const,
  integrationId: "integration-1",
  model: "vision-model",
}

function imageAttachment(id: string, name = `${id}.png`) {
  return {
    id,
    messageId: "message-1",
    name,
    originPath: `images/${name}`,
    mimeType: "image/png",
    size: 1024,
  }
}

function waitableJob(analysis: string) {
  return {
    waitUntilFinished: vi.fn().mockResolvedValue({ analysis }),
  }
}

describe("heavy system tools", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findAttachmentVisionAnalysis.mockResolvedValue(null)
    mocks.saveAttachmentVisionAnalysis.mockResolvedValue(null)
  })

  test("document_reader fallback waits on heavy and formats returned snippets", async () => {
    mocks.getContextSourceAdapter.mockReturnValue({
      prepareContext: vi.fn().mockResolvedValue({
        summary: null,
        snippets: [],
        resolvedSource: {
          source: { title: "Pricing PDF" },
          attachment: {
            id: "attachment-1",
            name: "pricing.pdf",
            originPath: "documents/pricing.pdf",
            mimeType: "application/pdf",
          },
        },
      }),
    })
    mocks.heavyQueueAdd.mockResolvedValue({
      waitUntilFinished: vi.fn().mockResolvedValue({
        snippets: ["Enterprise pricing is available on request."],
        truncated: false,
      }),
    })

    const executor = createDocumentReaderExecutor({ fileOnlyTrigger: false })
    const output = await executor({ query: "enterprise pricing" }, toolContext)

    expect(mocks.heavyQueueAdd).toHaveBeenCalledWith(
      "extractTextFromFile",
      {
        type: "extractTextFromFile",
        data: {
          workspaceId: "workspace-1",
          conversationId: "conversation-1",
          attachmentId: "attachment-1",
          originPath: "documents/pricing.pdf",
          mimeType: "application/pdf",
          query: "enterprise pricing",
        },
      },
      expect.objectContaining({
        jobId: expect.stringMatching(documentReaderJobIdRegex),
      }),
    )
    expect(output).toContain("Enterprise pricing is available on request.")
  })

  test("image_reader returns a cached analysis without queuing heavy work", async () => {
    mocks.resolveImageAttachment.mockResolvedValue({
      status: "selected",
      attachment: imageAttachment("attachment-1", "receipt.png"),
    })
    mocks.findAttachmentVisionAnalysis.mockResolvedValue({
      analysis: "The cached image analysis.",
    })

    const executor = createImageReaderExecutor({
      fileOnlyTrigger: false,
      modelId: providerInfo.model,
      providerInfo,
    })
    const output = await executor({ query: "what is this?" }, toolContext)

    expect(output).toContain("The cached image analysis.")
    expect(mocks.heavyQueueAdd).not.toHaveBeenCalled()
    expect(mocks.saveAttachmentVisionAnalysis).not.toHaveBeenCalled()
  })

  test("image_reader saves a successful heavy analysis for reuse", async () => {
    mocks.resolveImageAttachment.mockResolvedValue({
      status: "selected",
      attachment: imageAttachment("attachment-1", "receipt.png"),
    })
    mocks.heavyQueueAdd.mockResolvedValue(
      waitableJob("The image shows a receipt total."),
    )

    const executor = createImageReaderExecutor({
      fileOnlyTrigger: false,
      modelId: providerInfo.model,
      providerInfo,
    })
    await executor({ query: "what is this?" }, toolContext)

    expect(mocks.saveAttachmentVisionAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "workspace-1",
        conversationId: "conversation-1",
        attachmentId: "attachment-1",
        provider: "openaiCompatible",
        modelId: "vision-model",
        analysis: "The image shows a receipt total.",
        promptHash: expect.any(String),
      }),
    )
  })

  test("image_reader sends full providerInfo to heavy and returns its analysis", async () => {
    mocks.resolveImageAttachment.mockResolvedValue({
      status: "selected",
      attachment: imageAttachment("attachment-1", "receipt.png"),
    })
    mocks.heavyQueueAdd.mockResolvedValue(
      waitableJob("The image shows a receipt total."),
    )

    const executor = createImageReaderExecutor({
      fileOnlyTrigger: false,
      modelId: providerInfo.model,
      providerInfo,
    })
    const output = await executor({ query: "what is this?" }, toolContext)

    expect(mocks.heavyQueueAdd).toHaveBeenCalledWith(
      "analyzeImage",
      {
        type: "analyzeImage",
        data: expect.objectContaining({
          workspaceId: "workspace-1",
          originPath: "images/receipt.png",
          mimeType: "image/png",
          sizeBytes: 1024,
          providerInfo,
        }),
      },
      expect.objectContaining({
        jobId: expect.stringMatching(imageReaderJobIdRegex),
      }),
    )
    expect(output).toContain("The image shows a receipt total.")
  })

  test("image_reader queues every trigger batch image and returns ordered analyses", async () => {
    const first = imageAttachment("attachment-1", "first.png")
    const second = imageAttachment("attachment-2", "second.png")
    const third = imageAttachment("attachment-3", "third.png")
    mocks.resolveImageAttachment.mockResolvedValue({
      status: "selected_batch",
      attachments: [first, second, third],
    })
    mocks.heavyQueueAdd
      .mockResolvedValueOnce(waitableJob("First analysis."))
      .mockResolvedValueOnce(waitableJob("Second analysis."))
      .mockResolvedValueOnce(waitableJob("Third analysis."))

    const executor = createImageReaderExecutor({
      fileOnlyTrigger: true,
      modelId: providerInfo.model,
      providerInfo,
      triggerMessageId: "message-1",
    })
    const output = await executor({ query: "compare these" }, toolContext)

    expect(mocks.heavyQueueAdd).toHaveBeenCalledTimes(3)
    expect(mocks.heavyQueueAdd.mock.calls.map((call) => call[1].data.originPath)).toEqual([
      "images/first.png",
      "images/second.png",
      "images/third.png",
    ])
    expect(mocks.heavyQueueAdd.mock.calls.map((call) => call[1].data.prompt)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Image 1 of 3"),
        expect.stringContaining("Image 2 of 3"),
        expect.stringContaining("Image 3 of 3"),
      ]),
    )
    expect(output.indexOf("Image 1: first.png")).toBeLessThan(
      output.indexOf("Image 2: second.png"),
    )
    expect(output.indexOf("Image 2: second.png")).toBeLessThan(
      output.indexOf("Image 3: third.png"),
    )
    expect(output).toContain("Follow-up:")
    expect(output.match(/Follow-up:/g)).toHaveLength(1)
  })

  test("image_reader returns successful batch analyses when another image fails", async () => {
    const first = imageAttachment("attachment-1", "first.png")
    const second = imageAttachment("attachment-2", "second.png")
    mocks.resolveImageAttachment.mockResolvedValue({
      status: "selected_batch",
      attachments: [first, second],
    })
    mocks.heavyQueueAdd
      .mockResolvedValueOnce(waitableJob("First analysis."))
      .mockResolvedValueOnce({
        waitUntilFinished: vi.fn().mockRejectedValue(new Error("vision unavailable")),
      })

    const executor = createImageReaderExecutor({
      fileOnlyTrigger: false,
      modelId: providerInfo.model,
      providerInfo,
    })
    const output = await executor({ query: "what is shown?" }, toolContext)

    expect(output).toContain("Image 1: first.png")
    expect(output).toContain("First analysis.")
    expect(output).not.toContain("second.png")
    expect(output).not.toContain("vision unavailable")
  })

  test("image_reader rejects oversized trigger batches before queuing", async () => {
    mocks.resolveImageAttachment.mockResolvedValue({
      status: "selected_batch",
      attachments: Array.from({ length: 7 }, (_, index) =>
        imageAttachment(`attachment-${index + 1}`),
      ),
    })

    const executor = createImageReaderExecutor({
      fileOnlyTrigger: false,
      modelId: providerInfo.model,
      providerInfo,
    })
    const output = await executor({ query: "what is shown?" }, toolContext)

    expect(output).toContain("no more than 6 images")
    expect(mocks.heavyQueueAdd).not.toHaveBeenCalled()
  })

  test("image_reader asks for clarification without queuing analysis when historical images are ambiguous", async () => {
    mocks.resolveImageAttachment.mockResolvedValue({
      status: "ambiguous",
      context: "conversation",
      candidateCount: 2,
    })

    const executor = createImageReaderExecutor({
      fileOnlyTrigger: false,
      modelId: providerInfo.model,
      providerInfo,
    })
    const output = await executor(
      { imageContext: "first uploaded image", query: "what is this?" },
      toolContext,
    )

    expect(output).toContain("Ask the user which image they mean")
    expect(output).toContain("2 supported images")
    expect(mocks.heavyQueueAdd).not.toHaveBeenCalled()
  })

  test("image_reader changes job id when prompt context changes", async () => {
    mocks.resolveImageAttachment.mockResolvedValue({
      status: "selected",
      attachment: imageAttachment("attachment-1", "receipt.png"),
    })
    mocks.heavyQueueAdd.mockResolvedValue(
      waitableJob("The image shows a receipt total."),
    )

    const executor = createImageReaderExecutor({
      fileOnlyTrigger: false,
      modelId: providerInfo.model,
      providerInfo,
    })

    await executor(
      { imageContext: "first uploaded image", query: "what is this?" },
      toolContext,
    )
    await executor(
      { imageContext: "latest uploaded image", query: "what is this?" },
      toolContext,
    )

    const firstJobId = mocks.heavyQueueAdd.mock.calls[0]?.[2]?.jobId
    const secondJobId = mocks.heavyQueueAdd.mock.calls[1]?.[2]?.jobId

    expect(firstJobId).toEqual(expect.stringMatching(imageReaderJobIdRegex))
    expect(secondJobId).toEqual(expect.stringMatching(imageReaderJobIdRegex))
    expect(secondJobId).not.toBe(firstJobId)
    expect(firstJobId).not.toContain(":")
    expect(secondJobId).not.toContain(":")
  })
})
