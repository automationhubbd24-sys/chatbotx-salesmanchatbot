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
import { Loader2Icon, PencilIcon, PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useWorkspaceId } from "@/hooks/routing"
import { connectOpenaiCompatibleEmbeddingAction } from "./actions/connect.action"
import { updateOpenaiCompatibleEmbeddingAction } from "./actions/update.action"
import {
  connectOpenaiCompatibleEmbeddingRequest,
  updateOpenaiCompatibleEmbeddingRequest,
} from "./schema/request"
import type { IntegrationOpenaiCompatibleEmbeddingResource } from "./schema/resource"

type OpenaiCompatibleEmbeddingConnectDialogProps = {
  integration?: IntegrationOpenaiCompatibleEmbeddingResource | null
}

export function OpenaiCompatibleEmbeddingConnectDialog({
  integration,
}: OpenaiCompatibleEmbeddingConnectDialogProps) {
  const [open, setOpen] = useState(false)
  const workspaceId = useWorkspaceId()
  const router = useRouter()
  const t = useTranslations()
  const isEditing = Boolean(integration)

  const { form, handleSubmitWithAction } = useHookFormAction(
    isEditing
      ? updateOpenaiCompatibleEmbeddingAction.bind(null, workspaceId)
      : connectOpenaiCompatibleEmbeddingAction.bind(null, workspaceId),
    zodResolver(
      isEditing
        ? updateOpenaiCompatibleEmbeddingRequest
        : connectOpenaiCompatibleEmbeddingRequest,
    ),
    {
      actionProps: {
        onSuccess: () => {
          toast.success(
            t(isEditing ? "messages.updatedSuccess" : "messages.connectedSuccess", {
              feature: t("openaiCompatibleTextEmbedding.title"),
            }),
          )
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
          baseURL: integration?.baseURL ?? "",
          embeddingModel: integration?.embeddingModel ?? "",
          enabled: integration?.enabled ?? true,
        },
      },
    },
  )

  useEffect(() => {
    if (!open) {
      form.reset({
        apiKey: "",
        baseURL: integration?.baseURL ?? "",
        embeddingModel: integration?.embeddingModel ?? "",
        enabled: integration?.enabled ?? true,
      })
    }
  }, [form, integration, open])

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={
          <Button size="sm">
            {isEditing ? <PencilIcon /> : <PlusIcon />}
            {t(
              isEditing
                ? "openaiCompatibleTextEmbedding.edit"
                : "openaiCompatibleTextEmbedding.connect.label",
            )}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("openaiCompatibleTextEmbedding.title")}</DialogTitle>
          <DialogDescription>
            {t("openaiCompatibleTextEmbedding.connect.description")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={handleSubmitWithAction}>
            <InputField
              label={t("openaiCompatibleTextEmbedding.fields.baseURL")}
              name="baseURL"
              required
            />
            <InputField
              label={t("openaiCompatibleTextEmbedding.fields.embeddingModel")}
              name="embeddingModel"
              required
            />
            <InputField
              description={
                isEditing
                  ? t("openaiCompatibleTextEmbedding.apiKeyKeepExisting")
                  : undefined
              }
              label={t("fields.apiKey.label")}
              name="apiKey"
              required={!isEditing}
              type="password"
            />
            <SwitchField
              formItemClassName="flex flex-row items-center justify-start gap-3 space-y-0"
              label={t("openaiCompatibleTextEmbedding.fields.enabled")}
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
              <Button
                disabled={!form.formState.isValid || form.formState.isSubmitting}
                type="submit"
              >
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
