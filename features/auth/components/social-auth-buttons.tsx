"use client";

import type { ComponentType } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export type SocialAuthProvider = "google" | "microsoft";

const socialProviderMeta: Record<
  SocialAuthProvider,
  {
    label: string;
    icon: ComponentType<{ className?: string }>;
  }
> = {
  google: {
    label: "Google",
    icon: GoogleIcon,
  },
  microsoft: {
    label: "Microsoft",
    icon: MicrosoftIcon,
  },
};

type SocialAuthButtonsProps = {
  disabled: boolean;
  loadingProvider?: SocialAuthProvider | null;
  providers: SocialAuthProvider[];
  onProviderClick: (provider: SocialAuthProvider) => void;
};

export function SocialAuthButtons({
  disabled,
  loadingProvider,
  providers,
  onProviderClick,
}: SocialAuthButtonsProps) {
  if (!providers.length) {
    return null;
  }

  return (
    <div className="grid gap-3">
      {providers.map((provider) => {
        const meta = socialProviderMeta[provider];
        const Icon = meta.icon;

        return (
          <Button
            className="w-full"
            disabled={disabled}
            key={provider}
            onClick={() => onProviderClick(provider)}
            size="lg"
            type="button"
            variant="outline"
          >
            {loadingProvider === provider ? (
              <Spinner data-icon="inline-start" aria-hidden="true" />
            ) : (
              <Icon className="size-4" />
            )}
            Continue with {meta.label}
          </Button>
        );
      })}
    </div>
  );
}

/** Horizontal rule with label, placed between OAuth (primary) and email fields (secondary). */
export function AuthEmailDivider() {
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border/70" />
      </div>
      <div className="relative flex justify-center text-xs uppercase tracking-[0.14em] text-muted-foreground">
        <span className="bg-card px-3">Or continue with email</span>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
    >
      <path
        d="M21.805 12.23c0-.79-.07-1.545-.2-2.27H12v4.294h5.488a4.694 4.694 0 0 1-2.037 3.08v2.558h3.295c1.93-1.777 3.059-4.395 3.059-7.662Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.755 0 5.066-.913 6.754-2.477l-3.295-2.558c-.913.612-2.08.974-3.459.974-2.653 0-4.9-1.79-5.703-4.198H2.89v2.638A9.998 9.998 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.297 13.741A5.996 5.996 0 0 1 5.978 12c0-.604.11-1.19.319-1.741V7.621H2.89A9.998 9.998 0 0 0 2 12c0 1.61.386 3.134 1.07 4.379l3.227-2.638Z"
        fill="#FBBC04"
      />
      <path
        d="M12 6.062c1.499 0 2.844.516 3.904 1.528l2.927-2.927C17.061 3.014 14.75 2 12 2A9.998 9.998 0 0 0 3.07 7.621l3.227 2.638C7.1 7.852 9.347 6.062 12 6.062Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
    >
      <path d="M3 3h8.571v8.571H3z" fill="#F25022" />
      <path d="M12.429 3H21v8.571h-8.571z" fill="#7FBA00" />
      <path d="M3 12.429h8.571V21H3z" fill="#00A4EF" />
      <path d="M12.429 12.429H21V21h-8.571z" fill="#FFB900" />
    </svg>
  );
}
