import {
  type ChooseChannelStepSchema,
  chooseChannelStepDefaultFn,
  chooseChannelStepSchema,
} from "@salesmanchatbot.io/flow-config"
import type { StepDefinition } from "../definition"
import ChooseChannelStepEditor from "./editor"
import ChooseChannelStepViewer from "./viewer"

export const chooseChannelStep: StepDefinition<ChooseChannelStepSchema> = {
  editor: ChooseChannelStepEditor,
  viewer: ChooseChannelStepViewer,
  validator: chooseChannelStepSchema,
  defaultFn: chooseChannelStepDefaultFn,
}
