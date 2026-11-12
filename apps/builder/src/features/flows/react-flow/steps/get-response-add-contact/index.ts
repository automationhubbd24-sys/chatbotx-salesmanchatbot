import {
  type GetResponseAddContactSchema,
  getResponseAddContactDefaultFn,
  getResponseAddContactSchema,
} from "@salesmanchatbot.io/flow-config"
import type { StepDefinition } from "../definition"
import GetResponseAddContactEditor from "./editor"
import GetResponseAddContactViewer from "./viewer"

export const getResponseAddContactStep: StepDefinition<GetResponseAddContactSchema> =
  {
    editor: GetResponseAddContactEditor,
    viewer: GetResponseAddContactViewer,
    validator: getResponseAddContactSchema,
    defaultFn: getResponseAddContactDefaultFn,
  }
