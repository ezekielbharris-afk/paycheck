'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error)
  }, [error])

  return (
    <html>
      <body className="min-h-screen bg-[#0f0d0a] text-[#faf5eb]">
        <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-start justify-center gap-6 px-5 py-10">
          <h1 className="text-3xl font-black tracking-tight">Something went wrong</h1>
          <p className="text-sm leading-relaxed text-[#faf5eb]/80">
            The app hit an unexpected error. Try again.
          </p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center justify-center rounded-md bg-cyan-500 px-4 text-sm font-semibold text-black transition-colors hover:bg-cyan-400"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
