CREATE TABLE "IntegrationEmbedding" (
	"id" bigint PRIMARY KEY NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"auth" jsonb,
	"baseURL" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"integrationId" bigint NOT NULL,
	"model" text NOT NULL,
	"workspaceId" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "IntegrationEmbedding" ADD CONSTRAINT "IntegrationEmbedding_integrationId_Integration_id_fk" FOREIGN KEY ("integrationId") REFERENCES "public"."Integration"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "IntegrationEmbedding" ADD CONSTRAINT "IntegrationEmbedding_workspaceId_Workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
CREATE UNIQUE INDEX "IntegrationEmbedding_workspaceId_key" ON "IntegrationEmbedding" USING btree ("workspaceId" ASC NULLS LAST);
--> statement-breakpoint
CREATE UNIQUE INDEX "IntegrationEmbedding_integrationId_key" ON "IntegrationEmbedding" USING btree ("integrationId" ASC NULLS LAST);
