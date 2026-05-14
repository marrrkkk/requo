export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="checkout-light-force min-h-screen bg-[#f7f9f7] text-[#172b24]"
      style={{ colorScheme: "light" }}
    >
      {children}
    </div>
  );
}
