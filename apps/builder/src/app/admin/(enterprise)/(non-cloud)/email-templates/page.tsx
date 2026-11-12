import { tenantService } from "@salesmanchatbot.io/business"
import { ROOT_TENANT_ID } from "@salesmanchatbot.io/database/schema"
import { getTranslations } from "next-intl/server"
import { PlatformEmailTemplatesSettings } from "@/enterprise/features/platform-email-templates/platform-email-templates-settings"

export default async function AdminEmailTemplatesPage() {
  const t = await getTranslations()
  const setting = await tenantService.findById(ROOT_TENANT_ID)

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg sm:text-xl">
        {t("platformEmailTemplates.title")}
      </h3>

      <PlatformEmailTemplatesSettings
        basePath="/admin/email-templates"
        setting={setting}
      />
    </div>
  )
}
