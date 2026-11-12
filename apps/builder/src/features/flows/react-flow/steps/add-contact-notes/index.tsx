import {
  type AddContactNotesStepSchema,
  addContactNotesStepDefaultFn,
  addContactNotesStepSchema,
} from "@salesmanchatbot.io/flow-config"
import type { StepDefinition } from "../definition"
import AddContactNotesStepEditor from "./editor"
import AddContactNotesStepViewer from "./viewer"

export const addContactNotesStep: StepDefinition<AddContactNotesStepSchema> = {
  editor: AddContactNotesStepEditor,
  viewer: AddContactNotesStepViewer,
  validator: addContactNotesStepSchema,
  defaultFn: addContactNotesStepDefaultFn,
}
