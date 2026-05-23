import {
  bigint,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "@/lib/db/schema/auth";
import { businesses } from "@/lib/db/schema/businesses";

export const dataExports = pgTable("data_exports", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  format: text("format", { enum: ["json", "csv"] }).notNull(),
  status: text("status", {
    enum: ["pending", "processing", "completed", "failed"],
  })
    .notNull()
    .default("pending"),
  storagePath: text("storage_path"),
  fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
  parts: integer("parts").default(1),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const aiSecurityEvents = pgTable("ai_security_events", {
  id: text("id").primaryKey(),
  eventType: text("event_type", {
    enum: ["injection_detected", "injection_rejected", "output_redacted"],
  }).notNull(),
  patternMatched: text("pattern_matched"),
  userId: text("user_id"),
  businessId: text("business_id"),
  inputHash: text("input_hash"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
