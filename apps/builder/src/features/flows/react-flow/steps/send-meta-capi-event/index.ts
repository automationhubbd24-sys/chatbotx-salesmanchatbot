import {
  type SendMetaCapiEventSchema,
  sendMetaCapiEventDefaultFn,
  sendMetaCapiEventSchema,
} from "@salesmanchatbot.io/flow-config"
import type { StepDefinition } from "../definition"
import { SendMetaCapiEventEditor } from "./editor"
import SendMetaCapiEventViewer from "./viewer"

export const sendMetaCapiEventStep: StepDefinition<SendMetaCapiEventSchema> = {
  editor: SendMetaCapiEventEditor,
  viewer: SendMetaCapiEventViewer,
  validator: sendMetaCapiEventSchema,
  defaultFn: sendMetaCapiEventDefaultFn,
}
