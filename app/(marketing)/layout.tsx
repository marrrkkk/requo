import { CrispChatWidgetServer } from "@/components/integrations/crisp/crisp-chat-widget-server";
import { BookDemoProvider } from "@/components/marketing/book-demo-dialog";
import { MarketingPixelBackground } from "@/components/marketing/marketing-pixel-background";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="font-scope-geist relative isolate min-h-screen dark:[--background:#161616] dark:bg-[#161616]">
      <MarketingPixelBackground />
      <BookDemoProvider>
        {children}
        <CrispChatWidgetServer />
      </BookDemoProvider>
    </div>
  );
}

