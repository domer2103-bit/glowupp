"use client";

/**
 * Shown when something on a page crashes in the browser. Without this, Next
 * falls back to its own "Application error" screen, which is plain black on a
 * phone in dark mode and gives no way forward.
 */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-[#132a4d]">Something went wrong</h1>
      <p className="text-sm text-zinc-600">
        That page hit a problem — usually a dropped connection or an out-of-date page. Your project and photos are saved. Try again, or reload the page.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="rounded-full bg-[#3a6694] px-6 py-3 text-sm font-medium text-white hover:bg-[#2c5075]">
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full border border-[#3a6694] px-6 py-3 text-sm font-medium text-[#3a6694] hover:bg-blue-50"
        >
          Reload page
        </button>
      </div>
    </main>
  );
}
