import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/**
 * Renders assistant replies as markdown inside the shared `.ai-prose` layer.
 *
 * Raw HTML is never enabled (no `rehype-raw`), so model output cannot inject
 * markup. Links open in a new tab with a hardened `rel`, and images are
 * dropped so a generated URL can never trigger an outbound request from a
 * visitor's browser.
 */
export function ChatMarkdown({
  content,
  streaming = false,
  className,
}: {
  content: string;
  /** Fades in newly arrived blocks while a reply streams. */
  streaming?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "ai-prose text-sm leading-relaxed text-foreground",
        streaming && "ai-streaming",
        className,
      )}
    >
      <Markdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          a: ({ children, ...props }) => (
            <a {...props} rel="noopener noreferrer nofollow" target="_blank">
              {children}
            </a>
          ),
          table: ({ children, ...props }) => (
            <div className="ai-chat-scrollbar overflow-x-auto">
              <table {...props}>{children}</table>
            </div>
          ),
          img: () => null,
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
