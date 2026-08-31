import { CrispChatWidgetServer } from "@/components/integrations/crisp/crisp-chat-widget-server";
import { BookDemoProvider } from "@/components/marketing/book-demo-dialog";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BookDemoProvider>
      {children}
      <CrispChatWidgetServer />
    </BookDemoProvider>
  );
}

