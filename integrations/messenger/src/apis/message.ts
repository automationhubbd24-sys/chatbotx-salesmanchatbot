import type { FileType } from "@chatbotx.io/sdk"
import fetch from "cross-fetch"
import { DEFAULT_API_VERSION } from "../constants"
import { rescue } from "../exception"
import { facebookGraphClient } from "../lib/http-client"
import { logger } from "../lib/logger"
import type {
  FacebookMessage,
  FacebookSendMessageRequest,
  FacebookSendMessageResponse,
  MessengerAuthValue,
} from "../schema"

export const sendMessage = (
  auth: MessengerAuthValue,
  payload: FacebookSendMessageRequest,
): Promise<FacebookSendMessageResponse> => {
  const { version = DEFAULT_API_VERSION } = auth
  const endpoint = `${version}/me/messages`

  return rescue(endpoint, () =>
    facebookGraphClient.post<FacebookSendMessageResponse>(endpoint, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.tokens.accessToken}`,
      },
      json: payload,
      retry: 0,
    }),
  )
}

const getFileNameFromUrl = (url: string, contentType: string): string => {
  const extension = contentType.split("/")[1]?.split(";")[0] || "bin"
  try {
    const pathName = new URL(url).pathname
    const fileName = pathName.split("/").filter(Boolean).at(-1)
    return fileName || `messenger-attachment.${extension}`
  } catch {
    return `messenger-attachment.${extension}`
  }
}

const downloadAttachment = async (url: string) => {
  const response = await fetch(url, { headers: { "User-Agent": "node" } })
  if (!(response.ok && response.body)) {
    throw new Error(
      `Failed to download attachment (status ${response.status} ${response.statusText}): ${url}`,
    )
  }

  const contentType = response.headers.get("content-type") ?? "image/jpeg"
  const bytes = await response.arrayBuffer()
  return {
    bytes,
    contentType,
    fileName: getFileNameFromUrl(url, contentType),
  }
}

export const sendMessageWithUploadedAttachment = async (
  auth: MessengerAuthValue,
  payload: Omit<FacebookSendMessageRequest, "message"> & {
    message: FacebookMessage
  },
  attachment: { type: FileType; url: string },
): Promise<FacebookSendMessageResponse> => {
  const { version = DEFAULT_API_VERSION } = auth
  const endpoint = `${version}/me/messages`

  return rescue(endpoint, async () => {
    const { bytes, contentType, fileName } = await downloadAttachment(
      attachment.url,
    )
    const form = new FormData()
    form.append("recipient", JSON.stringify(payload.recipient))
    form.append(
      "message",
      JSON.stringify({
        ...payload.message,
        attachment: {
          type: attachment.type,
          payload: { is_reusable: true },
        },
      }),
    )
    form.append("messaging_type", payload.messaging_type ?? "RESPONSE")
    if (payload.tag) {
      form.append("tag", payload.tag)
    }
    if (payload.notification_type) {
      form.append("notification_type", payload.notification_type)
    }
    if (payload.persona_id) {
      form.append("persona_id", payload.persona_id)
    }
    form.append("filedata", new Blob([bytes], { type: contentType }), fileName)

    logger.info("Uploading Messenger attachment as multipart filedata")

    return facebookGraphClient.post<FacebookSendMessageResponse>(endpoint, {
      headers: {
        Authorization: `Bearer ${auth.tokens.accessToken}`,
      },
      body: form,
      retry: 0,
    })
  })
}
