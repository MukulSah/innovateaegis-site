"use client";

import { FormEvent, useState } from "react";

const examplePrompts = [
  "What should I work on today?",
  "Why is Sentra delayed?",
  "Show all open bugs.",
  "Which projects are at risk?",
  "What did the engineering team complete this week?",
  "Generate a roadmap for Unite.",
];

export function AskSaiCard() {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState(
    "Ask SAI anything about objectives, projects, employees, agents, customers, releases, revenue, meetings, or decisions.",
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const question = prompt.trim();
    if (!question) {
      return;
    }

    setAnswer(
      `SAI is ready to analyze: "${question}". Connect live company data next to turn this prototype into an operational answer.`,
    );
    setPrompt("");
  }

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-gradient-to-br from-cyan-500/15 via-purple-500/10 to-blue-500/10 p-6 shadow-[0_24px_90px_rgba(6,182,212,0.12)] md:p-8">
      <div className="absolute inset-0 opacity-40">
        <div className="absolute -left-16 top-12 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -right-12 bottom-8 h-56 w-56 rounded-full bg-purple-500/20 blur-3xl" />
      </div>

      <div className="relative grid gap-7 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
            First command
          </p>
          <h2 className="mt-5 text-4xl font-bold tracking-tight text-white md:text-5xl">Ask SAI</h2>
          <p className="mt-4 text-sm leading-7 text-white/65">
            Like ChatGPT, but connected to the entire company. SAI Brain understands work, people, agents,
            products, revenue, releases, meetings, documentation, and decisions.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#050510]/70 p-4 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={3}
              placeholder="Ask SAI about the company..."
              className="min-h-24 w-full resize-none bg-transparent px-2 py-2 text-sm leading-6 text-white outline-none placeholder:text-white/30"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-full bg-white px-5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-950 transition-transform hover:-translate-y-0.5"
              >
                Ask
              </button>
            </div>
          </form>

          <div className="mt-4 rounded-2xl border border-cyan-300/10 bg-cyan-400/5 p-4 text-sm leading-7 text-cyan-50/80">
            {answer}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {examplePrompts.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPrompt(item)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/65 transition-colors hover:border-cyan-300/30 hover:text-cyan-100"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
