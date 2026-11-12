import { devicePlatformTypes } from "@salesmanchatbot.io/database/partials"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { z } from "zod"

export const registerDeviceTokenRequest = z.object({
  workspaceId: zodBigintAsString().optional(),
  platform: devicePlatformTypes,
  token: z.string().min(1),
})

export const unregisterDeviceTokenRequest = z.object({
  token: z.string().min(1),
})
