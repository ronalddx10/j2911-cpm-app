CREATE TABLE "d_cpm_clients" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"client_type" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"organization_name" varchar,
	"office_id" bigint,
	"email" varchar NOT NULL,
	"phone" varchar NOT NULL,
	"location" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "d_cpm_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"item_name" varchar NOT NULL,
	"category" varchar NOT NULL,
	CONSTRAINT "d_cpm_items_item_name_unique" UNIQUE("item_name")
);
--> statement-breakpoint
CREATE TABLE "bridge_cpm_meal_periods" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_day_id" bigint NOT NULL,
	"menu_id" bigint NOT NULL,
	"pax" integer NOT NULL,
	"rate" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bridge_cpm_menu_items" (
	"menu_id" bigint NOT NULL,
	"item_id" bigint NOT NULL,
	CONSTRAINT "bridge_cpm_menu_items_menu_id_item_id_pk" PRIMARY KEY("menu_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "d_cpm_menus" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"base_rate" numeric(12, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "d_cpm_menus_title_unique" UNIQUE("title")
);
--> statement-breakpoint
CREATE TABLE "d_cpm_offices" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"office_name" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "d_cpm_offices_office_name_unique" UNIQUE("office_name")
);
--> statement-breakpoint
CREATE TABLE "bridge_cpm_order_days" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_id" bigint NOT NULL,
	"event_date" date NOT NULL,
	CONSTRAINT "bridge_cpm_order_days_order_id_event_date_key" UNIQUE("order_id","event_date")
);
--> statement-breakpoint
CREATE TABLE "f_cpm_order_history" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_id" bigint NOT NULL,
	"from_status_id" bigint NOT NULL,
	"to_status_id" bigint NOT NULL,
	"changed_by_user_id" bigint NOT NULL,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "d_cpm_order_status" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"status_name" varchar NOT NULL,
	CONSTRAINT "d_cpm_order_status_status_name_unique" UNIQUE("status_name")
);
--> statement-breakpoint
CREATE TABLE "f_cpm_orders" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"client_id" bigint NOT NULL,
	"venue_id" bigint,
	"custom_delivery_address" text,
	"service_type_id" bigint NOT NULL,
	"status_id" bigint NOT NULL,
	"ingress_time" time,
	"egress_time" time,
	"grand_total" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"pdf_generated_flag" boolean DEFAULT false NOT NULL,
	"pdf_file_path" varchar,
	"special_instructions" text,
	"created_by_user_id" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "d_cpm_service_types" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"service_name" varchar NOT NULL,
	CONSTRAINT "d_cpm_service_types_service_name_unique" UNIQUE("service_name")
);
--> statement-breakpoint
CREATE TABLE "d_cpm_users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"username" varchar NOT NULL,
	"password_hash" varchar NOT NULL,
	"role" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "d_cpm_users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "d_cpm_venues" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"venue_name" varchar NOT NULL,
	"capacity" integer NOT NULL,
	"physical_address" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "d_cpm_venues_venue_name_unique" UNIQUE("venue_name")
);
--> statement-breakpoint
ALTER TABLE "d_cpm_clients" ADD CONSTRAINT "d_cpm_clients_office_id_d_cpm_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."d_cpm_offices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bridge_cpm_meal_periods" ADD CONSTRAINT "bridge_cpm_meal_periods_order_day_id_bridge_cpm_order_days_id_fk" FOREIGN KEY ("order_day_id") REFERENCES "public"."bridge_cpm_order_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bridge_cpm_meal_periods" ADD CONSTRAINT "bridge_cpm_meal_periods_menu_id_d_cpm_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."d_cpm_menus"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bridge_cpm_menu_items" ADD CONSTRAINT "bridge_cpm_menu_items_menu_id_d_cpm_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."d_cpm_menus"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bridge_cpm_menu_items" ADD CONSTRAINT "bridge_cpm_menu_items_item_id_d_cpm_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."d_cpm_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bridge_cpm_order_days" ADD CONSTRAINT "bridge_cpm_order_days_order_id_f_cpm_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."f_cpm_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "f_cpm_order_history" ADD CONSTRAINT "f_cpm_order_history_order_id_f_cpm_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."f_cpm_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "f_cpm_order_history" ADD CONSTRAINT "f_cpm_order_history_from_status_id_d_cpm_order_status_id_fk" FOREIGN KEY ("from_status_id") REFERENCES "public"."d_cpm_order_status"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "f_cpm_order_history" ADD CONSTRAINT "f_cpm_order_history_to_status_id_d_cpm_order_status_id_fk" FOREIGN KEY ("to_status_id") REFERENCES "public"."d_cpm_order_status"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "f_cpm_orders" ADD CONSTRAINT "f_cpm_orders_client_id_d_cpm_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."d_cpm_clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "f_cpm_orders" ADD CONSTRAINT "f_cpm_orders_venue_id_d_cpm_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."d_cpm_venues"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "f_cpm_orders" ADD CONSTRAINT "f_cpm_orders_service_type_id_d_cpm_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "public"."d_cpm_service_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "f_cpm_orders" ADD CONSTRAINT "f_cpm_orders_status_id_d_cpm_order_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."d_cpm_order_status"("id") ON DELETE restrict ON UPDATE no action;