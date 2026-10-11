"use client";

/** Last-resort fallback for a crash in the root layout itself (error.tsx covers everything inside it). Needs its own <html>/<body>. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#ffffff", color: "#132a4d", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: 420, margin: "0 auto", padding: "96px 24px", textAlign: "center" }}>
          <h1 style={{ fontSize: 24 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "#52525b" }}>Your project and photos are saved. Please try again, or reload the page.</p>
          <button
            type="button"
            onClick={reset}
            style={{ marginRight: 8, background: "#3a6694", color: "#fff", border: 0, borderRadius: 999, padding: "12px 24px", fontSize: 14 }}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ background: "#fff", color: "#3a6694", border: "1px solid #3a6694", borderRadius: 999, padding: "12px 24px", fontSize: 14 }}
          >
            Reload page
          </button>
        </main>
      </body>
    </html>
  );
}
