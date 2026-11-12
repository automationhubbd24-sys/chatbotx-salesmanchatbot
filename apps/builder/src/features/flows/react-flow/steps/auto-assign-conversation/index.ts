import {
  type AutoAssignConversationStepSchema,
  autoAssignConversationStepDefaultFn,
  autoAssignConversationStepSchema,
} from "@salesmanchatbot.io/flow-config"
import type { StepDefinition } from "../definition"
import AutoAssignConversationStepEditor from "./editor"
import AutoAssignConversationStepViewer from "./viewer"

export const autoAssignConversationStep: StepDefinition<AutoAssignConversationStepSchema> =
  {
    editor: AutoAssignConversationStepEditor,
    viewer: AutoAssignConversationStepViewer,
    validator: autoAssignConversationStepSchema,
    defaultFn: autoAssignConversationStepDefaultFn,
  }
