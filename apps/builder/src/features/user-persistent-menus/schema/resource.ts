import { messengerPersistentMenuSchema } from "@salesmanchatbot.io/database/partials"
import {
  createSelectSchema,
  userPersistentMenuModel,
} from "@salesmanchatbot.io/database/schema"
import { z } from "zod"

export const userPersistentMenuResource = createSelectSchema(
  userPersistentMenuModel,
  {
    id: z.string(),
    workspaceId: z.string(),
    menus: z.array(messengerPersistentMenuSchema),
  },
)
export type UserPersistentMenuResource = z.infer<
  typeof userPersistentMenuResource
>
