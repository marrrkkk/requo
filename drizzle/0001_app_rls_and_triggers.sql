CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '');
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.is_workspace_member(target_workspace_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = target_workspace_id
      AND wm.user_id = public.current_app_user_id()
  );
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.is_workspace_owner(target_workspace_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = target_workspace_id
      AND wm.user_id = public.current_app_user_id()
      AND wm.role = 'owner'
  );
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS user_set_updated_at ON public."user";
CREATE TRIGGER user_set_updated_at
BEFORE UPDATE ON public."user"
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();
--> statement-breakpoint

DROP TRIGGER IF EXISTS session_set_updated_at ON public.session;
CREATE TRIGGER session_set_updated_at
BEFORE UPDATE ON public.session
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();
--> statement-breakpoint

DROP TRIGGER IF EXISTS account_set_updated_at ON public.account;
CREATE TRIGGER account_set_updated_at
BEFORE UPDATE ON public.account
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();
--> statement-breakpoint

DROP TRIGGER IF EXISTS verification_set_updated_at ON public.verification;
CREATE TRIGGER verification_set_updated_at
BEFORE UPDATE ON public.verification
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();
--> statement-breakpoint

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();
--> statement-breakpoint

DROP TRIGGER IF EXISTS workspaces_set_updated_at ON public.workspaces;
CREATE TRIGGER workspaces_set_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();
--> statement-breakpoint

DROP TRIGGER IF EXISTS workspace_members_set_updated_at ON public.workspace_members;
CREATE TRIGGER workspace_members_set_updated_at
BEFORE UPDATE ON public.workspace_members
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();
--> statement-breakpoint

DROP TRIGGER IF EXISTS inquiries_set_updated_at ON public.inquiries;
CREATE TRIGGER inquiries_set_updated_at
BEFORE UPDATE ON public.inquiries
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();
--> statement-breakpoint

DROP TRIGGER IF EXISTS inquiry_attachments_set_updated_at ON public.inquiry_attachments;
CREATE TRIGGER inquiry_attachments_set_updated_at
BEFORE UPDATE ON public.inquiry_attachments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();
--> statement-breakpoint

DROP TRIGGER IF EXISTS inquiry_notes_set_updated_at ON public.inquiry_notes;
CREATE TRIGGER inquiry_notes_set_updated_at
BEFORE UPDATE ON public.inquiry_notes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();
--> statement-breakpoint

DROP TRIGGER IF EXISTS quotes_set_updated_at ON public.quotes;
CREATE TRIGGER quotes_set_updated_at
BEFORE UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();
--> statement-breakpoint

DROP TRIGGER IF EXISTS quote_items_set_updated_at ON public.quote_items;
CREATE TRIGGER quote_items_set_updated_at
BEFORE UPDATE ON public.quote_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();
--> statement-breakpoint

DROP TRIGGER IF EXISTS knowledge_files_set_updated_at ON public.knowledge_files;
CREATE TRIGGER knowledge_files_set_updated_at
BEFORE UPDATE ON public.knowledge_files
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();
--> statement-breakpoint

DROP TRIGGER IF EXISTS knowledge_faqs_set_updated_at ON public.knowledge_faqs;
CREATE TRIGGER knowledge_faqs_set_updated_at
BEFORE UPDATE ON public.knowledge_faqs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();
--> statement-breakpoint

DROP TRIGGER IF EXISTS activity_logs_set_updated_at ON public.activity_logs;
CREATE TRIGGER activity_logs_set_updated_at
BEFORE UPDATE ON public.activity_logs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();
--> statement-breakpoint

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces FORCE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.inquiry_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiry_attachments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.inquiry_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiry_notes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_files FORCE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_faqs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
USING (user_id = (SELECT public.current_app_user_id()));
--> statement-breakpoint

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own
ON public.profiles
FOR INSERT
WITH CHECK (user_id = (SELECT public.current_app_user_id()));
--> statement-breakpoint

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
USING (user_id = (SELECT public.current_app_user_id()))
WITH CHECK (user_id = (SELECT public.current_app_user_id()));
--> statement-breakpoint

DROP POLICY IF EXISTS profiles_delete_own ON public.profiles;
CREATE POLICY profiles_delete_own
ON public.profiles
FOR DELETE
USING (user_id = (SELECT public.current_app_user_id()));
--> statement-breakpoint

DROP POLICY IF EXISTS workspaces_select_member ON public.workspaces;
CREATE POLICY workspaces_select_member
ON public.workspaces
FOR SELECT
USING ((SELECT public.is_workspace_member(id)));
--> statement-breakpoint

DROP POLICY IF EXISTS workspaces_update_owner ON public.workspaces;
CREATE POLICY workspaces_update_owner
ON public.workspaces
FOR UPDATE
USING ((SELECT public.is_workspace_owner(id)))
WITH CHECK ((SELECT public.is_workspace_owner(id)));
--> statement-breakpoint

DROP POLICY IF EXISTS workspaces_delete_owner ON public.workspaces;
CREATE POLICY workspaces_delete_owner
ON public.workspaces
FOR DELETE
USING ((SELECT public.is_workspace_owner(id)));
--> statement-breakpoint

DROP POLICY IF EXISTS workspace_members_select_member ON public.workspace_members;
CREATE POLICY workspace_members_select_member
ON public.workspace_members
FOR SELECT
USING ((SELECT public.is_workspace_member(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS workspace_members_insert_owner ON public.workspace_members;
CREATE POLICY workspace_members_insert_owner
ON public.workspace_members
FOR INSERT
WITH CHECK ((SELECT public.is_workspace_owner(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS workspace_members_update_owner ON public.workspace_members;
CREATE POLICY workspace_members_update_owner
ON public.workspace_members
FOR UPDATE
USING ((SELECT public.is_workspace_owner(workspace_id)))
WITH CHECK ((SELECT public.is_workspace_owner(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS workspace_members_delete_owner ON public.workspace_members;
CREATE POLICY workspace_members_delete_owner
ON public.workspace_members
FOR DELETE
USING ((SELECT public.is_workspace_owner(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS inquiries_select_member ON public.inquiries;
CREATE POLICY inquiries_select_member
ON public.inquiries
FOR SELECT
USING ((SELECT public.is_workspace_member(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS inquiries_insert_owner ON public.inquiries;
CREATE POLICY inquiries_insert_owner
ON public.inquiries
FOR INSERT
WITH CHECK ((SELECT public.is_workspace_owner(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS inquiries_update_owner ON public.inquiries;
CREATE POLICY inquiries_update_owner
ON public.inquiries
FOR UPDATE
USING ((SELECT public.is_workspace_owner(workspace_id)))
WITH CHECK ((SELECT public.is_workspace_owner(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS inquiries_delete_owner ON public.inquiries;
CREATE POLICY inquiries_delete_owner
ON public.inquiries
FOR DELETE
USING ((SELECT public.is_workspace_owner(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS inquiry_attachments_select_member ON public.inquiry_attachments;
CREATE POLICY inquiry_attachments_select_member
ON public.inquiry_attachments
FOR SELECT
USING ((SELECT public.is_workspace_member(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS inquiry_attachments_insert_owner ON public.inquiry_attachments;
CREATE POLICY inquiry_attachments_insert_owner
ON public.inquiry_attachments
FOR INSERT
WITH CHECK ((SELECT public.is_workspace_owner(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS inquiry_attachments_update_owner ON public.inquiry_attachments;
CREATE POLICY inquiry_attachments_update_owner
ON public.inquiry_attachments
FOR UPDATE
USING ((SELECT public.is_workspace_owner(workspace_id)))
WITH CHECK ((SELECT public.is_workspace_owner(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS inquiry_attachments_delete_owner ON public.inquiry_attachments;
CREATE POLICY inquiry_attachments_delete_owner
ON public.inquiry_attachments
FOR DELETE
USING ((SELECT public.is_workspace_owner(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS inquiry_notes_select_member ON public.inquiry_notes;
CREATE POLICY inquiry_notes_select_member
ON public.inquiry_notes
FOR SELECT
USING ((SELECT public.is_workspace_member(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS inquiry_notes_insert_owner ON public.inquiry_notes;
CREATE POLICY inquiry_notes_insert_owner
ON public.inquiry_notes
FOR INSERT
WITH CHECK ((SELECT public.is_workspace_owner(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS inquiry_notes_update_owner ON public.inquiry_notes;
CREATE POLICY inquiry_notes_update_owner
ON public.inquiry_notes
FOR UPDATE
USING ((SELECT public.is_workspace_owner(workspace_id)))
WITH CHECK ((SELECT public.is_workspace_owner(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS inquiry_notes_delete_owner ON public.inquiry_notes;
CREATE POLICY inquiry_notes_delete_owner
ON public.inquiry_notes
FOR DELETE
USING ((SELECT public.is_workspace_owner(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS quotes_select_member ON public.quotes;
CREATE POLICY quotes_select_member
ON public.quotes
FOR SELECT
USING ((SELECT public.is_workspace_member(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS quotes_insert_owner ON public.quotes;
CREATE POLICY quotes_insert_owner
ON public.quotes
FOR INSERT
WITH CHECK ((SELECT public.is_workspace_owner(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS quotes_update_owner ON public.quotes;
CREATE POLICY quotes_update_owner
ON public.quotes
FOR UPDATE
USING ((SELECT public.is_workspace_owner(workspace_id)))
WITH CHECK ((SELECT public.is_workspace_owner(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS quotes_delete_owner ON public.quotes;
CREATE POLICY quotes_delete_owner
ON public.quotes
FOR DELETE
USING ((SELECT public.is_workspace_owner(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS quote_items_select_member ON public.quote_items;
CREATE POLICY quote_items_select_member
ON public.quote_items
FOR SELECT
USING ((SELECT public.is_workspace_member(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS quote_items_insert_owner ON public.quote_items;
CREATE POLICY quote_items_insert_owner
ON public.quote_items
FOR INSERT
WITH CHECK ((SELECT public.is_workspace_owner(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS quote_items_update_owner ON public.quote_items;
CREATE POLICY quote_items_update_owner
ON public.quote_items
FOR UPDATE
USING ((SELECT public.is_workspace_owner(workspace_id)))
WITH CHECK ((SELECT public.is_workspace_owner(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS quote_items_delete_owner ON public.quote_items;
CREATE POLICY quote_items_delete_owner
ON public.quote_items
FOR DELETE
USING ((SELECT public.is_workspace_owner(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS knowledge_files_select_member ON public.knowledge_files;
CREATE POLICY knowledge_files_select_member
ON public.knowledge_files
FOR SELECT
USING ((SELECT public.is_workspace_member(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS knowledge_files_insert_owner ON public.knowledge_files;
CREATE POLICY knowledge_files_insert_owner
ON public.knowledge_files
FOR INSERT
WITH CHECK ((SELECT public.is_workspace_owner(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS knowledge_files_update_owner ON public.knowledge_files;
CREATE POLICY knowledge_files_update_owner
ON public.knowledge_files
FOR UPDATE
USING ((SELECT public.is_workspace_owner(workspace_id)))
WITH CHECK ((SELECT public.is_workspace_owner(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS knowledge_files_delete_owner ON public.knowledge_files;
CREATE POLICY knowledge_files_delete_owner
ON public.knowledge_files
FOR DELETE
USING ((SELECT public.is_workspace_owner(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS knowledge_faqs_select_member ON public.knowledge_faqs;
CREATE POLICY knowledge_faqs_select_member
ON public.knowledge_faqs
FOR SELECT
USING ((SELECT public.is_workspace_member(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS knowledge_faqs_insert_owner ON public.knowledge_faqs;
CREATE POLICY knowledge_faqs_insert_owner
ON public.knowledge_faqs
FOR INSERT
WITH CHECK ((SELECT public.is_workspace_owner(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS knowledge_faqs_update_owner ON public.knowledge_faqs;
CREATE POLICY knowledge_faqs_update_owner
ON public.knowledge_faqs
FOR UPDATE
USING ((SELECT public.is_workspace_owner(workspace_id)))
WITH CHECK ((SELECT public.is_workspace_owner(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS knowledge_faqs_delete_owner ON public.knowledge_faqs;
CREATE POLICY knowledge_faqs_delete_owner
ON public.knowledge_faqs
FOR DELETE
USING ((SELECT public.is_workspace_owner(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS activity_logs_select_member ON public.activity_logs;
CREATE POLICY activity_logs_select_member
ON public.activity_logs
FOR SELECT
USING ((SELECT public.is_workspace_member(workspace_id)));
--> statement-breakpoint

DROP POLICY IF EXISTS activity_logs_insert_owner ON public.activity_logs;
CREATE POLICY activity_logs_insert_owner
ON public.activity_logs
FOR INSERT
WITH CHECK ((SELECT public.is_workspace_owner(workspace_id)));
