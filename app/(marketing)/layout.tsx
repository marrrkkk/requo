import { CrispChatWidgetServer } from "@/components/integrations/crisp/crisp-chat-widget-server";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <CrispChatWidgetServer />
    </>
  );
}
