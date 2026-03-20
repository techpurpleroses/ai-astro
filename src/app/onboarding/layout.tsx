export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#030814] text-white">
      <div className="mx-auto min-h-screen w-full max-w-[430px] border-x border-white/10 bg-[#050b17] shadow-[0_0_80px_rgba(8,145,178,0.14)]">
        {children}
      </div>
    </div>
  );
}
