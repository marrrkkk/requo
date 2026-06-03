-- Enable RLS on all public tables and add default-deny policies.
-- This silences Supabase linter warnings without affecting the app,
-- since Drizzle uses a direct connection that bypasses RLS.

ALTER TABLE "public"."account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."account_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."admin_audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ai_conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ai_drafts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ai_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ai_security_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ai_token_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ai_usage_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."analytics_annotations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."analytics_benchmarks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."analytics_daily_rollups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."analytics_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."analytics_goal_thresholds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."analytics_scheduled_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."automation_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."automation_scheduled_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."billing_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."business_automations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."business_inquiry_forms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."business_member_invites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."business_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."business_memories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."business_notification_reads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."business_notification_states" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."business_notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."business_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."businesses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."conversation_summaries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."data_exports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."email_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."email_outbox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."follow_ups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."inquiries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."inquiry_attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."inquiry_duplicates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."inquiry_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."inquiry_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."invoice_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."job_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."payment_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."post_win_checklist_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."public_action_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."quote_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."quote_library_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."quote_library_entry_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."quote_revision_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."quote_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."quotes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rate_limit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."refunds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."reply_snippets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_recent_businesses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."verification" ENABLE ROW LEVEL SECURITY;

-- Default-deny policy: blocks all access through PostgREST/Supabase client.
-- App traffic goes through Drizzle via direct connection and is unaffected.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'account','account_subscriptions','activity_logs','admin_audit_logs',
    'ai_conversations','ai_drafts','ai_messages','ai_security_events',
    'ai_token_logs','ai_usage_events','analytics_annotations','analytics_benchmarks',
    'analytics_daily_rollups','analytics_events','analytics_goal_thresholds',
    'analytics_scheduled_reports','audit_logs','automation_logs','automation_scheduled_jobs',
    'billing_events','business_automations','business_inquiry_forms','business_member_invites',
    'business_members','business_memories','business_notification_reads',
    'business_notification_states','business_notifications','business_subscriptions',
    'businesses','conversation_summaries','data_exports','email_attempts','email_outbox',
    'follow_ups','inquiries','inquiry_attachments','inquiry_duplicates','inquiry_messages',
    'inquiry_notes','invoice_items','invoices','job_items','jobs','payment_attempts',
    'post_win_checklist_items','profiles','public_action_events','push_subscriptions',
    'quote_items','quote_library_entries','quote_library_entry_items','quote_revision_requests',
    'quote_versions','quotes','rate_limit','refunds','reply_snippets','session','user',
    'user_recent_businesses','verification'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'CREATE POLICY "deny_all" ON "public".%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
      t
    );
  END LOOP;
END
$$;
