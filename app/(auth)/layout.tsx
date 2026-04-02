export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="surface-grid min-h-screen">{children}</div>;
}
