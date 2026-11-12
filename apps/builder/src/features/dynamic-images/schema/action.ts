import { dynamicImageDocument } from "@salesmanchatbot.io/database/partials"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { z } from "zod"

export const createDynamicImageRequest = z.object({
  name: z.string().min(1).max(100).describe("Dynamic image name."),
  customFieldId: zodBigintAsString()
    .nullish()
    .describe(
      "Custom field id whose per-contact value personalizes the render.",
    ),
  data: dynamicImageDocument.describe(
    "Image template document (layers, text, positioning).",
  ),
})
export type CreateDynamicImageRequest = z.infer<
  typeof createDynamicImageRequest
>

export const updateDynamicImageRequest = createDynamicImageRequest
export type UpdateDynamicImageRequest = z.infer<
  typeof updateDynamicImageRequest
>
