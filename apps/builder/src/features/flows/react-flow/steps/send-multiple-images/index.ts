import {
  type SendMultipleImagesStepSchema,
  sendMultipleImagesStepDefaultFn,
  sendMultipleImagesStepSchema,
} from "@salesmanchatbot.io/flow-config"
import type { StepDefinition } from "../definition"
import SendMultipleImagesStepEditor from "./editor"
import SendMultipleImagesStepViewer from "./viewer"

const sendMultipleImagesStep: StepDefinition<SendMultipleImagesStepSchema> = {
  editor: SendMultipleImagesStepEditor,
  viewer: SendMultipleImagesStepViewer,
  validator: sendMultipleImagesStepSchema,
  defaultFn: sendMultipleImagesStepDefaultFn,
}

export default sendMultipleImagesStep
