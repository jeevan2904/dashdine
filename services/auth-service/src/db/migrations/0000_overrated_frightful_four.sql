CREATE TYPE "public"."account_status" AS ENUM('ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION');--> statement-breakpoint
CREATE TYPE "public"."oauth_provider" AS ENUM('GOOGLE', 'APPLE', 'FACEBOOK');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('CUSTOMER', 'RIDER', 'RESTAURANT_OWNER', 'RESTAURANT_STAFF', 'ADMIN');--> statement-breakpoint
CREATE TABLE "auth_credentials" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"email" varchar(255),
	"phone" varchar(20),
	"password_hash" varchar(255),
	"role" "user_role" NOT NULL,
	"status" "account_status" DEFAULT 'PENDING_VERIFICATION' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"two_factor_secret" varchar(255),
	"last_login_at" timestamp with time zone,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"provider" "oauth_provider" NOT NULL,
	"provider_user_id" varchar(255) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"device_info" varchar(500),
	"ip_address" varchar(45),
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_auth_credentials_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_credentials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_auth_credentials_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_credentials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_auth_email" ON "auth_credentials" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_auth_phone" ON "auth_credentials" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_auth_role" ON "auth_credentials" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_auth_status" ON "auth_credentials" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_oauth_provider_user" ON "oauth_accounts" USING btree ("provider","provider_user_id");--> statement-breakpoint
CREATE INDEX "idx_oauth_user" ON "oauth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_refresh_token_hash" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_refresh_user" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_refresh_expires" ON "refresh_tokens" USING btree ("expires_at");