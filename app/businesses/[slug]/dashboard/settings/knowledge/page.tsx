import { PageHeader } from "@/components/shared/page-header";
import {
  createKnowledgeFaqAction,
  deleteKnowledgeFaqAction,
  deleteKnowledgeFileAction,
  updateKnowledgeFaqAction,
  uploadKnowledgeFileAction,
} from "@/features/knowledge/actions";
import { getKnowledgeDashboardData } from "@/features/knowledge/queries";
import { BusinessKnowledgeManager } from "@/features/settings/components/business-knowledge-manager";
import { getBusinessOwnerPageContext } from "../_lib/page-context";

export default async function BusinessKnowledgePage() {
  const { businessContext } = await getBusinessOwnerPageContext();
  const knowledgeData = await getKnowledgeDashboardData(businessContext.business.id);

  return (
    <>
      <PageHeader
        eyebrow="Responses"
        title="Knowledge base"
        description="Files and FAQs used in drafts and replies."
      />

      <BusinessKnowledgeManager
        createFaqAction={createKnowledgeFaqAction}
        deleteFaqAction={deleteKnowledgeFaqAction}
        deleteFileAction={deleteKnowledgeFileAction}
        knowledgeData={knowledgeData}
        updateFaqAction={updateKnowledgeFaqAction}
        uploadFileAction={uploadKnowledgeFileAction}
      />
    </>
  );
}
