"use client"

import type { AIGenerateTextSchema } from "@salesmanchatbot.io/flow-config"
import {
  aiGenerateTextDefaultFn,
  aiGenerateTextSchema,
} from "@salesmanchatbot.io/flow-config"
import type { StepDefinition } from "../definition"
import { AIGenerateTextEditor } from "./editor"
import { AIGenerateTextViewer } from "./viewer"

export const aiGenerateTextStep: StepDefinition<AIGenerateTextSchema> = {
  editor: AIGenerateTextEditor,
  viewer: AIGenerateTextViewer,
  validator: aiGenerateTextSchema,
  defaultFn: aiGenerateTextDefaultFn,
}

export default aiGenerateTextStep
