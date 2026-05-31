import { AnalyticsFreePanel } from "@/features/analytics/components/analytics-free-panel";
import { getFreeAnalytics } from "@/features/analytics/queries";

type Props = {
  businessId: string;
};

export async function AnalyticsFreeSection({ businessId }: Props) {
  const data = await getFreeAnalytics(businessId);

  return <AnalyticsFreePanel data={data} />;
}
