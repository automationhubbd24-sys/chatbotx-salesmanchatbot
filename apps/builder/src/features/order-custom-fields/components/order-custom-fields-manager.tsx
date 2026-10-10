"use client"

import type { OrderCustomFieldType, OrderType } from "@chatbotx.io/database/partials"
import { InputField } from "@chatbotx.io/ui/components/form/input-field"
import { InputNumberField } from "@chatbotx.io/ui/components/form/input-number-field"
import { SelectField } from "@chatbotx.io/ui/components/form/select-field"
import { SwitchField } from "@chatbotx.io/ui/components/form/switch-field"
import { Button } from "@chatbotx.io/ui/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@chatbotx.io/ui/components/ui/card"
import { Form } from "@chatbotx.io/ui/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { createOrderCustomFieldAction } from "../actions/create-order-custom-field.action"
import { deleteOrderCustomFieldAction } from "../actions/delete-order-custom-field.action"
import { updateOrderCustomFieldAction } from "../actions/update-order-custom-field.action"
import { orderCustomFieldDefinitionSchema } from "../schema/action"

type Definition = { id: string; orderType: OrderType; key: string; label: string; type: OrderCustomFieldType; required: boolean; customerEditable: boolean; aiVisible: boolean; displayOrder: number; options: string[] | null }
type Values = { orderType: OrderType; key: string; label: string; type: OrderCustomFieldType; required: boolean; customerEditable: boolean; aiVisible: boolean; displayOrder: number; options?: string[] | string | null }

export function OrderCustomFieldsManager({ workspaceId, definitions }: { workspaceId: string; definitions: Definition[] }) {
  const t = useTranslations()
  const [editing, setEditing] = useState<Definition | null>(null)
  const [creating, setCreating] = useState(false)
  const orderTypeOptions = useMemo(() => ["product", "appointment", "quote", "digital_service"].map((value) => ({ value, label: t(`orders.types.${value === "digital_service" ? "digitalService" : value}`) })), [t])
  const typeOptions = useMemo(
    () =>
      ["text", "phone", "email", "number", "currency", "date", "datetime", "select", "multiselect", "boolean", "textarea"].map((value) => ({
        value,
        label: t(`orders.customFieldTypes.${value}`),
      })),
    [t],
  )

  return <Card>
    <CardHeader className="flex flex-row items-center justify-between"><CardTitle>{t("orders.customFields")}</CardTitle><Button onClick={() => setCreating(true)} size="sm"><PlusIcon />{t("actions.add")}</Button></CardHeader>
    <CardContent className="space-y-3">
      {definitions.length === 0 ? <p className="text-muted-foreground text-sm">{t("orders.customFieldsEmpty")}</p> : definitions.map((field) => <div className="flex items-center justify-between border-b py-2 last:border-0" key={field.id}><div><p className="font-medium">{field.label}</p><p className="text-muted-foreground text-xs">{field.key} · {t(`orders.customFieldTypes.${field.type}`)}</p></div><div className="flex gap-1"><Button aria-label={t("actions.edit")} onClick={() => setEditing(field)} size="icon" variant="ghost"><PencilIcon /></Button><Button aria-label={t("actions.delete")} onClick={() => { deleteOrderCustomFieldAction.bind(null, workspaceId, field.id)().then(() => location.reload()).catch(() => toast.error(t("messages.error"))) }} size="icon" variant="ghost"><Trash2Icon /></Button></div></div>)}
      {(creating || editing) && <OrderCustomFieldForm definitions={definitions} field={editing} onClose={() => { setCreating(false); setEditing(null) }} orderTypeOptions={orderTypeOptions} typeOptions={typeOptions} workspaceId={workspaceId} />}
    </CardContent>
  </Card>
}

function OrderCustomFieldForm({ workspaceId, field, onClose, orderTypeOptions, typeOptions }: { workspaceId: string; field: Definition | null; definitions: Definition[]; onClose: () => void; orderTypeOptions: Array<{ value: string; label: string }>; typeOptions: Array<{ value: string; label: string }> }) {
  if (field) return <OrderCustomFieldEditForm field={field} onClose={onClose} typeOptions={typeOptions} workspaceId={workspaceId} />
  return <OrderCustomFieldCreateForm onClose={onClose} orderTypeOptions={orderTypeOptions} typeOptions={typeOptions} workspaceId={workspaceId} />
}

function OrderCustomFieldCreateForm({ workspaceId, onClose, orderTypeOptions, typeOptions }: { workspaceId: string; onClose: () => void; orderTypeOptions: Array<{ value: string; label: string }>; typeOptions: Array<{ value: string; label: string }> }) {
  const t = useTranslations()
  const { form, handleSubmitWithAction } = useHookFormAction(createOrderCustomFieldAction.bind(null, workspaceId), zodResolver(orderCustomFieldDefinitionSchema), { formProps: { defaultValues: { orderType: "product", key: "", label: "", type: "text", required: false, customerEditable: true, aiVisible: true, displayOrder: 0, options: "" } } })
  return <Form {...form}><form className="space-y-3 border-t pt-4" onSubmit={handleSubmitWithAction}><InputField label={t("orders.customFieldLabel")} name="label" required /><InputField label={t("orders.customFieldKey")} name="key" required /><SelectField label={t("orders.customFieldOrderType")} name="orderType" options={orderTypeOptions} required /><SelectField label={t("orders.customFieldType")} name="type" options={typeOptions} required /><InputNumberField label={t("orders.customFieldDisplayOrder")} min={0} name="displayOrder" /><SwitchField label={t("orders.customFieldRequired")} name="required" /><SwitchField label={t("orders.customFieldCustomerEditable")} name="customerEditable" /><SwitchField label={t("orders.customFieldAiVisible")} name="aiVisible" /><InputField label={t("orders.customFieldOptions")} name="options" /><div className="flex justify-end gap-2"><Button onClick={onClose} type="button" variant="ghost">{t("actions.cancel")}</Button><Button disabled={form.formState.isSubmitting} type="submit">{t("actions.save")}</Button></div></form></Form>
}

function OrderCustomFieldEditForm({ workspaceId, field, onClose, typeOptions }: { workspaceId: string; field: Definition; onClose: () => void; typeOptions: Array<{ value: string; label: string }> }) {
  const t = useTranslations()
  const schema = orderCustomFieldDefinitionSchema.omit({ orderType: true })
  const { form, handleSubmitWithAction } = useHookFormAction(updateOrderCustomFieldAction.bind(null, workspaceId, field.id), zodResolver(schema), { formProps: { defaultValues: { key: field.key, label: field.label, type: field.type, required: field.required, customerEditable: field.customerEditable, aiVisible: field.aiVisible, displayOrder: field.displayOrder, options: field.options?.join("\n") ?? "" } } })
  return <Form {...form}><form className="space-y-3 border-t pt-4" onSubmit={handleSubmitWithAction}><InputField label={t("orders.customFieldLabel")} name="label" required /><InputField label={t("orders.customFieldKey")} name="key" required /><SelectField label={t("orders.customFieldType")} name="type" options={typeOptions} required /><InputNumberField label={t("orders.customFieldDisplayOrder")} min={0} name="displayOrder" /><SwitchField label={t("orders.customFieldRequired")} name="required" /><SwitchField label={t("orders.customFieldCustomerEditable")} name="customerEditable" /><SwitchField label={t("orders.customFieldAiVisible")} name="aiVisible" /><InputField label={t("orders.customFieldOptions")} name="options" /><div className="flex justify-end gap-2"><Button onClick={onClose} type="button" variant="ghost">{t("actions.cancel")}</Button><Button disabled={form.formState.isSubmitting} type="submit">{t("actions.save")}</Button></div></form></Form>
}
