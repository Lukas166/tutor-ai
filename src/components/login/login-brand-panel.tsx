import Image from 'next/image';

export function LoginBrandPanel() {
  return (
    <section className="relative hidden min-h-svh overflow-hidden lg:flex">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 hover:scale-105 scale-x-[-1]"
        style={{ backgroundImage: "url('/login/lecturer_teaching.png')" }}
      />
      <div className="absolute inset-0 bg-black/80 backdrop-blur-[4px]" />

      <div className="relative z-10 flex h-full w-full flex-col px-10 py-10 xl:px-14">
        {/* Top Logo */}
        <div className="flex items-center gap-3">
          <Image
            src="/white_unpad.png"
            alt="Unpad Logo"
            width={120}
            height={36}
            className="h-12 w-auto object-contain"
            priority
          />
        </div>

        {/* Content Area */}
        <div className="my-auto max-w-xl space-y-6">
          <div className="space-y-2">
            <h2 className="text-brand text-2xl font-black uppercase tracking-[0.1em] mb-5">
              Tutor AI
            </h2>
            <p className="text-[40px] leading-[1.1] font-extrabold text-white">
              Upload materials, access courses, discuss with AI.
            </p>
          </div>
          <p className="text-base font-medium text-white/70 mt-[-5]">
            Understand your subjects better with personalized AI assistance designed specifically for the Unpad academic community.
          </p>
        </div>

      {/* Bottom Footer */}
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-widest text-brand/80">
            Official Partner
          </span>
          <p className="text-sm font-medium text-white/60">
            <span className="text-white font-semibold">Universitas Padjadjaran</span>
          </p>
        </div>
      </div>
    </section>
  );
}
