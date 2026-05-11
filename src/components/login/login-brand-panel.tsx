import Image from 'next/image';

export function LoginBrandPanel() {
  return (
    <section className="relative hidden min-h-svh overflow-hidden lg:flex">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 hover:scale-105 scale-x-[-1]"
        style={{ backgroundImage: "url('/login/lecturer_teaching.png')" }}
      />
      <div className="absolute inset-0 bg-black/80 backdrop-blur-[4px]" />

      <div className="relative z-10 flex h-full w-full flex-col px-10 py-8 xl:px-12">
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo_unpad.png"
            alt="Tutor AI logo"
            width={100}
            height={24}
            className="h-8 w-auto object-contain"
            priority
          />
          <span className="text-xl font-bold tracking-tight text-white">
            Tutor AI
          </span>
        </div>

        <div className="my-auto max-w-xl space-y-5">
          <p className="text-[34px] leading-[1.25] font-bold text-white">
            Upload materials, access courses, and discuss with AI to understand your subjects better.
          </p>
        </div>
      </div>
    </section>
  );
}
