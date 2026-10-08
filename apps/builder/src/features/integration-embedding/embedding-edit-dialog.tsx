"use client"

import { InputField } from "@chatbotx.io/ui/components/form/input-field"
import { SwitchField } from "@chatbotx.io/ui/components/form/switch-field"
import { Button } from "@chatbotx.io/ui/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@chatbotx.io/ui/components/ui/dialog"
import { Form } from "@chatbotx.io/ui/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks"
import { Loader2Icon, PencilIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"
import { useWorkspaceId } from "@/hooks/routing"
import { updateIntegrationEmbeddingAction } from "./actions/update.action"
import { updateIntegrationEmbeddingSchema } from "./schema/request"
import type { IntegrationEmbeddingResource } from "./schema/resource"

export function EmbeddingEditDialog({
  integration,
}: {
  integration: IntegrationEmbeddingResource
}) {
  const [open, setOpen] = useState(false)
  const workspaceId = useWorkspaceId()
  const router = useRouter()
  const t = useTranslations()

  const { form, handleSubmitWithAction } = useHookFormAction(
    updateIntegrationEmbeddingAction.bind(null, workspaceId),
    zodResolver(updateIntegrationEmbeddingSchema),
    {
      actionProps: {
        onSuccess: () => {
          toast.success(t("messages.updatedSuccess"))
          setOpen(false)
          router.refresh()
        },
        onError: ({ error }) => {
          if (error.serverError) {
            toast.error(error.serverError)
          }
        },
      },
      formProps: {
        mode: "onChange",
        defaultValues: {
          apiKey: "",
          baseURL: integration.baseURL,
          enabled: integration.enabled,
          model: integration.model,
        },
      },
    },
  )

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={
          <Button size="sm" type="button" variant="outline">
            <PencilIcon className="size-4" />
            {t("actions.edit")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("embedding.title")}</DialogTitle>
          <DialogDescription />
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={handleSubmitWithAction}>
            <InputField
              label={t("embedding.fields.baseURL")}
              name="baseURL"
              required
            />
            <InputField
              label={t("embedding.fields.model")}
              name="model"
              required
            />
            <InputField
              description={t("embedding.apiKeyKeepExisting")}
              label={t("fields.apiKey.label")}
              name="apiKey"
              type="password"
            />
            <SwitchField
              formItemClassName="flex flex-row items-center justify-start gap-3 space-y-0"
              label={t("embedding.fields.enabled")}
              name="enabled"
              required
            />
            <DialogFooter>
              <DialogClose
                render={
                  <Button type="button" variant="secondary">
                    {t("actions.cancel")}
                  </Button>
                }
              />
              <Button disabled={form.formState.isSubmitting} type="submit">
                {form.formState.isSubmitting && (
                  <Loader2Icon className="animate-spin" />
                )}
                {t("actions.confirm")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
