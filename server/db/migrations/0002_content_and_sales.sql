CREATE TYPE "public"."inquiry_status" AS ENUM('new', 'done');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('new', 'confirmed', 'in_progress', 'shipped', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."page_entry_type" AS ENUM('text', 'media');--> statement-breakpoint
CREATE TABLE "branch_translations" (
	"branch_id" integer NOT NULL,
	"language_code" varchar(8) NOT NULL,
	"address" varchar(255) NOT NULL,
	"working_hours" varchar(128),
	CONSTRAINT "branch_translations_branch_id_language_code_pk" PRIMARY KEY("branch_id","language_code")
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_code" char(2) NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"phone" varchar(32),
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_logos" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" char(2),
	"email" varchar(255) NOT NULL,
	"full_name" varchar(128) NOT NULL,
	"phone" varchar(32),
	"password_hash" text,
	"google_linked" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"legacy_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_code" char(2) NOT NULL,
	"name" varchar(160) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"message" text,
	"source" varchar(64),
	"status" "inquiry_status" DEFAULT 'new' NOT NULL,
	"handled_by_id" uuid,
	"handled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_code" char(2) NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"image_id" uuid,
	"page_image_id" uuid,
	"instagram_link" varchar(512),
	"view_count" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"legacy_id" integer,
	"created_by_id" uuid,
	"updated_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_translations" (
	"news_id" integer NOT NULL,
	"language_code" varchar(8) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	CONSTRAINT "news_translations_news_id_language_code_pk" PRIMARY KEY("news_id","language_code")
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"from_status" "order_status",
	"to_status" "order_status",
	"note" text,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer,
	"sku" varchar(64) NOT NULL,
	"name" varchar(200) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_usd" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_code" char(2) NOT NULL,
	"customer_id" uuid,
	"status" "order_status" DEFAULT 'new' NOT NULL,
	"contact_name" varchar(160) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"second_phone" varchar(32),
	"email" varchar(255),
	"address" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"comment" text,
	"currency_code" char(3) DEFAULT 'USD' NOT NULL,
	"rate_to_usd" numeric(18, 6) DEFAULT '1' NOT NULL,
	"total_usd" numeric(14, 2) NOT NULL,
	"legacy_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_code" char(2) NOT NULL,
	"page_key" varchar(64) NOT NULL,
	"key" varchar(128) NOT NULL,
	"type" "page_entry_type" DEFAULT 'text' NOT NULL,
	"info" varchar(255),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_entry_media" (
	"entry_id" integer NOT NULL,
	"media_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "page_entry_media_entry_id_media_id_pk" PRIMARY KEY("entry_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "page_entry_translations" (
	"entry_id" integer NOT NULL,
	"language_code" varchar(8) NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "page_entry_translations_entry_id_language_code_pk" PRIMARY KEY("entry_id","language_code")
);
--> statement-breakpoint
ALTER TABLE "branch_translations" ADD CONSTRAINT "branch_translations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_translations" ADD CONSTRAINT "branch_translations_language_code_languages_code_fk" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_country_code_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_updated_by_id_admin_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_logos" ADD CONSTRAINT "customer_logos_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_logos" ADD CONSTRAINT "customer_logos_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_country_code_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_country_code_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_handled_by_id_admin_users_id_fk" FOREIGN KEY ("handled_by_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_country_code_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_page_image_id_media_id_fk" FOREIGN KEY ("page_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_created_by_id_admin_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_updated_by_id_admin_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_translations" ADD CONSTRAINT "news_translations_news_id_news_id_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_translations" ADD CONSTRAINT "news_translations_language_code_languages_code_fk" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_country_code_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_entries" ADD CONSTRAINT "page_entries_country_code_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_entries" ADD CONSTRAINT "page_entries_updated_by_id_admin_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_entry_media" ADD CONSTRAINT "page_entry_media_entry_id_page_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."page_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_entry_media" ADD CONSTRAINT "page_entry_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_entry_translations" ADD CONSTRAINT "page_entry_translations_entry_id_page_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."page_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_entry_translations" ADD CONSTRAINT "page_entry_translations_language_code_languages_code_fk" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "branches_country_idx" ON "branches" USING btree ("country_code","sort_order");--> statement-breakpoint
CREATE INDEX "customer_logos_customer_idx" ON "customer_logos" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_email_idx" ON "customers" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "customers_legacy_idx" ON "customers" USING btree ("legacy_id");--> statement-breakpoint
CREATE INDEX "customers_country_idx" ON "customers" USING btree ("country_code","created_at");--> statement-breakpoint
CREATE INDEX "inquiries_list_idx" ON "inquiries" USING btree ("country_code","status","created_at");--> statement-breakpoint
CREATE INDEX "news_list_idx" ON "news" USING btree ("country_code","status","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "news_legacy_idx" ON "news" USING btree ("country_code","legacy_id");--> statement-breakpoint
CREATE INDEX "order_events_order_idx" ON "order_events" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_list_idx" ON "orders" USING btree ("country_code","status","created_at");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_legacy_idx" ON "orders" USING btree ("country_code","legacy_id");--> statement-breakpoint
CREATE UNIQUE INDEX "page_entries_key_idx" ON "page_entries" USING btree ("country_code","page_key","key");