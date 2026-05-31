import { cn } from "@/lib/utils";
import { Markdown } from "./markdown";

export type MessageProps = {
  children: React.ReactNode;
  className?: string;
} & React.HTMLProps<HTMLDivElement>;

const Message = ({ children, className, ...props }: MessageProps) => (
  <div className={cn("flex gap-3", className)} {...props}>
    {children}
  </div>
);

export type MessageAvatarProps = {
  children: React.ReactNode;
  className?: string;
};

const MessageAvatar = ({ children, className }: MessageAvatarProps) => {
  return (
    <div
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
};

export type MessageContentProps = {
  children: React.ReactNode;
  markdown?: boolean;
  className?: string;
};

const MessageContent = ({
  children,
  markdown = false,
  className,
}: MessageContentProps) => {
  const classNames = cn(
    "prose prose-sm max-w-none break-words text-foreground dark:prose-invert",
    className,
  );

  return markdown ? (
    <Markdown className={classNames}>{children as string}</Markdown>
  ) : (
    <div className={classNames}>{children}</div>
  );
};

export type MessageActionsProps = {
  children: React.ReactNode;
  className?: string;
} & React.HTMLProps<HTMLDivElement>;

const MessageActions = ({
  children,
  className,
  ...props
}: MessageActionsProps) => (
  <div
    className={cn("flex items-center gap-1 text-muted-foreground", className)}
    {...props}
  >
    {children}
  </div>
);

export { Message, MessageAvatar, MessageContent, MessageActions };
