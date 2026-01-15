export function HeroPattern() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      {/* Gradient blur orbs */}
      <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-100/40 blur-[150px] mix-blend-multiply opacity-60"></div>
      <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-100/40 blur-[150px] mix-blend-multiply opacity-60"></div>
      {/* Subtle noise texture */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150"></div>
    </div>
  );
}
