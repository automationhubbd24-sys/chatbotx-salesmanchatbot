import {
  type AIExtractDataSchema,
  aiExtractDataDefaultFn,
  aiExtractDataSchema,
} from "@salesmanchatbot.io/flow-config"
import type { StepDefinition } from "../definition"
import { AIExtractDataEditor } from "./editor"
import { AIExtractDataViewer } from "./viewer"

export const aiExtractDataStep: StepDefinition<AIExtractDataSchema> = {
  editor: AIExtractDataEditor,
  viewer: AIExtractDataViewer,
  validator: aiExtractDataSchema,
  defaultFn: aiExtractDataDefaultFn,
}
