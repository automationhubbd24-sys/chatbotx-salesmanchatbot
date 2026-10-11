"use client"

import { Button } from "@chatbotx.io/ui/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@chatbotx.io/ui/components/ui/dialog"
import { Form } from "@chatbotx.io/ui/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks"
import { Loader2Icon, SheetIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"
import { SpreadsheetSelect } from "../flows/react-flow/steps/spreadsheet/components/spreadsheet-select"
import { WorksheetSelect } from "../flows/react-flow/steps/spreadsheet/worksheet-select"
import { syncOrdersToGoogleSheetsAction } from "./actions/sync-orders-to-google-sheets.action"
import type { ExportOrdersRequest } from "./schema/action"
import { syncOrdersToGoogleSheetsRequest } from "./schema/action"

export function SyncOrdersToGoogleSheetsDialog({
  workspaceId,
  filters,
}: {
  workspaceId: string
  filters: ExportOrdersRequest
}) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const { form, handleSubmitWithAction, resetFormAndAction } =
    useHookFormAction(
      syncOrdersToGoogleSheetsAction.bind(null, workspaceId),
      zodResolver(syncOrdersToGoogleSheetsRequest),
      {
        actionProps: {
          onSuccess: ({ data }) => {
            toast.success(
              `${t("messages.syncedSuccessfully")} (${data?.synced ?? 0})`,
            )
            setOpen(false)
            resetFormAndAction()
          },
          onError: ({ error }) => {
            if (error.serverError) {
              toast.error(error.serverError)
            }
          },
        },
        formProps: {
          defaultValues: {
            ...filters,
            spreadsheetId: "",
            sheetName: "",
          },
        },
        errorMapProps: {},
      },
    )
  const spreadsheetId = form.watch("spreadsheetId")

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={
          <Button disabled={form.formState.isSubmitting} variant="outline">
            <SheetIcon className="size-4" />
            {t("actions.synchronize")}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("actions.synchronize")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={handleSubmitWithAction}>
            <SpreadsheetSelect name="spreadsheetId" />
            {spreadsheetId ? (
              <WorksheetSelect name="sheetName" spreadsheetId={spreadsheetId} />
            ) : null}
            <DialogFooter>
              <DialogClose
                render={
                  <Button type="button" variant="ghost">
                    {t("actions.cancel")}
                  </Button>
                }
              />
              <Button
                disabled={
                  !form.formState.isValid || form.formState.isSubmitting
                }
                type="submit"
              >
                {form.formState.isSubmitting ? (
                  <Loader2Icon className="animate-spin" />
                ) : null}
                {t("actions.synchronize")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
