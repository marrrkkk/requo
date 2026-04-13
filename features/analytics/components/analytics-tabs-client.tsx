"use client";

import { BarChart3, GitCompareArrows, Timer } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LockedFeatureOverlay } from "@/components/shared/paywall";
import { analyticsSections } from "@/features/analytics/config";
import type {
  BusinessAnalyticsData,
  ConversionAnalyticsData,
  WorkflowAnalyticsData,
} from "@/features/analytics/types";
import type { WorkspacePlan } from "@/lib/plans";
import { AnalyticsOverviewTab } from "@/features/analytics/components/analytics-overview-tab";
import { AnalyticsConversionTab } from "@/features/analytics/components/analytics-conversion-tab";
import { AnalyticsWorkflowTab } from "@/features/analytics/components/analytics-workflow-tab";

export function AnalyticsTabsClient({
  overviewData,
  conversionData,
  workflowData,
  currency,
  plan,
}: {
  overviewData: BusinessAnalyticsData;
  conversionData: ConversionAnalyticsData;
  workflowData: WorkflowAnalyticsData;
  currency: string;
  plan: WorkspacePlan;
}) {
  return (
    <Tabs defaultValue={analyticsSections.overview.id}>
      <TabsList variant="line">
        <TabsTrigger value={analyticsSections.overview.id}>
          <BarChart3 data-icon="inline-start" />
          {analyticsSections.overview.label}
        </TabsTrigger>
        <TabsTrigger value={analyticsSections.conversion.id}>
          <GitCompareArrows data-icon="inline-start" />
          {analyticsSections.conversion.label}
        </TabsTrigger>
        <TabsTrigger value={analyticsSections.workflow.id}>
          <Timer data-icon="inline-start" />
          {analyticsSections.workflow.label}
        </TabsTrigger>
      </TabsList>

      <TabsContent value={analyticsSections.overview.id}>
        <AnalyticsOverviewTab data={overviewData} />
      </TabsContent>

      <TabsContent value={analyticsSections.conversion.id}>
        <LockedFeatureOverlay feature="analyticsConversion" plan={plan}>
          <AnalyticsConversionTab data={conversionData} currency={currency} />
        </LockedFeatureOverlay>
      </TabsContent>

      <TabsContent value={analyticsSections.workflow.id}>
        <LockedFeatureOverlay feature="analyticsWorkflow" plan={plan}>
          <AnalyticsWorkflowTab data={workflowData} />
        </LockedFeatureOverlay>
      </TabsContent>
    </Tabs>
  );
}
