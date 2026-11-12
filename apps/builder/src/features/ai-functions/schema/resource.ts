import {
  aiFunctionModel,
  createSelectSchema,
} from "@salesmanchatbot.io/database/schema"
import { zodBigintAsString } from "@salesmanchatbot.io/utils/zod"

export const aiFunctionResource = createSelectSchema(aiFunctionModel, {
  id: zodBigintAsString(),
  workspaceId: zodBigintAsString(),
})
