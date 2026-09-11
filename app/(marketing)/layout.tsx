import { CrispChatWidgetServer } from "@/components/integrations/crisp/crisp-chat-widget-server";
import { BookDemoProvider } from "@/components/marketing/book-demo-dialog";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="font-scope-geist">
      <BookDemoProvider>
        {children}
        <CrispChatWidgetServer />
      </BookDemoProvider>
    </div>
  );
}

