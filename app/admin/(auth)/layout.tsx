import { Suspense } from "react";

export default function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense>{children}</Suspense>;
}
