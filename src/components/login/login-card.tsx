import { LoginForm } from '@/components/login/login-form';

export function LoginCard() {
  return (
    <div className="relative z-10 w-full max-w-md xl:max-w-lg">
      <div className="mb-6 space-y-2">
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight text-foreground sm:text-[32px] text-center">
          Login to Your Account
        </h1>
        <p className="text-center text-sm font-medium text-muted-foreground">
          Welcome back! Please login as <span className="text-foreground font-semibold">Student</span> or <span className="text-foreground font-semibold">Lecturer</span>.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
