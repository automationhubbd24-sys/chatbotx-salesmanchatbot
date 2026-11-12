import { dynamicImageDocument } from "@salesmanchatbot.io/database/partials"
import {
  createSelectSchema,
  dynamicImageModel,
} from "@salesmanchatbot.io/database/schema"
import { z } from "zod"

export const dynamicImageResource = createSelectSchema(dynamicImageModel, {
  id: z.string(),
  workspaceId: z.string(),
  customFieldId: z.string().nullable(),
  data: dynamicImageDocument,
  backgroundUrl: z.string().nullable(),
})
export type DynamicImageResource = z.infer<typeof dynamicImageResource>
