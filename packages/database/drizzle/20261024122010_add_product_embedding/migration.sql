CREATE TABLE "ProductEmbedding" (
	"id" bigint PRIMARY KEY,
	"createdAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"productId" bigint NOT NULL,
	"workspaceId" bigint NOT NULL,
	"content" text NOT NULL,
	"contentHash" text NOT NULL,
	"model" text NOT NULL,
	"dimensions" integer NOT NULL,
	"embedding" vector(3072) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "IntegrationOpenaiCompatible" ADD COLUMN "embeddingModel" text;--> statement-breakpoint
CREATE UNIQUE INDEX "ProductEmbedding_productId_key" ON "ProductEmbedding" ("productId");--> statement-breakpoint
CREATE INDEX "ProductEmbedding_workspaceId_idx" ON "ProductEmbedding" ("workspaceId");--> statement-breakpoint
CREATE INDEX "ProductEmbedding_embedding_idx" ON "ProductEmbedding" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
ALTER TABLE "ProductEmbedding" ADD CONSTRAINT "ProductEmbedding_productId_Product_id_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "ProductEmbedding" ADD CONSTRAINT "ProductEmbedding_workspaceId_Workspace_id_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;