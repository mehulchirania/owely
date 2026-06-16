const features = [
  {
    title: "Split any way",
    body: "Equal, unequal, or by percentage — paise-perfect every time, no rounding leaks.",
  },
  {
    title: "Settle over UPI",
    body: "One tap opens your UPI app pre-filled. No wallet, no middleman, no fees.",
  },
  {
    title: "Works offline",
    body: "Add expenses on patchy networks. They sync when you're back online.",
  },
  {
    title: "Actually free",
    body: "Every feature, no paywalls, no \"Pro\" tier. Built India-first.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center px-6 py-20 text-center">
      <section className="flex max-w-2xl flex-col items-center gap-6">
        <span className="text-6xl" role="img" aria-label="owl">
          🦉
        </span>
        <h1 className="text-5xl font-bold tracking-tight text-zinc-900 sm:text-6xl dark:text-zinc-50">
          Owely
        </h1>
        <p className="text-balance text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Split expenses with friends, flatmates, and trips — then settle up over
          UPI in one tap. Free, forever.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href="/login"
            className="flex h-12 items-center justify-center rounded-full bg-emerald-600 px-7 font-medium text-white transition-colors hover:bg-emerald-700"
          >
            Get started
          </a>
          <a
            href="#features"
            className="flex h-12 items-center justify-center rounded-full border border-zinc-300 px-7 font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            How it works
          </a>
        </div>
      </section>

      <section
        id="features"
        className="mt-24 grid w-full max-w-3xl gap-4 sm:grid-cols-2"
      >
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-zinc-200 p-6 text-left dark:border-zinc-800"
          >
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {f.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {f.body}
            </p>
          </div>
        ))}
      </section>

      <footer className="mt-24 text-sm text-zinc-500">
        © {new Date().getFullYear()} Owely · Made in India 🇮🇳
      </footer>
    </main>
  );
}
