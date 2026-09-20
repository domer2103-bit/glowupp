import Link from "next/link";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 py-16 dark:bg-black">
      <h1 className="text-2xl font-semibold">Create your GlowUpp account</h1>
      <SignupForm />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
      <p className="max-w-xs text-center text-xs text-zinc-500 dark:text-zinc-500">
        By signing up, you agree to GlowUpp&rsquo;s{" "}
        <Link href="/terms" className="underline">Terms of Service</Link> and{" "}
        <Link href="/privacy" className="underline">Privacy Policy</Link>.
      </p>
    </div>
  );
}
