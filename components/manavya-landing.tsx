"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getFramerTransition, motionTokens } from "@/lib/motion";
import type { Product } from "@/lib/products";

type ManavyaLandingPageProps = {
  product: Product;
};

// Custom SVG Icons
const PlayIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="w-4 h-4 ml-1.5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-4 h-4 ml-1.5 inline-block transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

const CheckIcon = ({ className = "w-4 h-4 text-emerald-400" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const CrossIcon = ({ className = "w-4 h-4 text-rose-400" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export function ManavyaLandingPage({ product }: ManavyaLandingPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [simIndex, setSimIndex] = useState(0);
  const [simStep, setSimStep] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const simInterval = useRef<NodeJS.Timeout | null>(null);

  // Mouse Parallax Glow Coordinates
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current.style.setProperty("--mouse-x", `${x}px`);
    containerRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  // Detailed Simulator Data
  const simulations = [
    {
      title: "News Scraper",
      query: "Write a node script to fetch and log news articles containing 'AI agents' from Hacker News.",
      routing: "Needs high-complexity code execution & live web search capabilities.",
      analysis: "Parse requested parameters: keyword 'AI agents', site 'Hacker News', language 'Node.js'. Verify target URLs.",
      planning: "Plan execution turns: 1) Run Tavily search for recent HN threads, 2) Retrieve HTML templates, 3) Generate cheerio code block, 4) Verify script compile integrity.",
      search: "Search returned 8 active threads on Hacker News. Extracted post titles and link nodes.",
      tool: "Invoked code planner agent. Select target libraries: Axios, Cheerio. Compile script schema.",
      reasoning: "Analyze HTML structure of HN. Anchor tag class is '.titleline > a'. Iterate titles and print items matching /AI agent/i.",
      verification: "Verification: Checks for syntax safety, ensures no deprecated methods, ensures error handling blocks exist.",
      response: "Completed script generation. Here is your Node.js Hacker News scraper, equipped with request pooling and filter checks...",
      code: `const axios = require('axios');\nconst cheerio = require('cheerio');\n\nasync function fetchHNAgents() {\n  try {\n    const { data } = await axios.get('https://news.ycombinator.com/');\n    const $ = cheerio.load(data);\n    $('.titleline > a').each((i, el) => {\n      const title = $(el).text();\n      const link = $(el).attr('href');\n      if (/AI agent/i.test(title)) {\n        console.log(\`[HN] \${title} -> \${link}\`);\n      }\n    });\n  } catch (err) {\n    console.error('Scraper failed:', err.message);\n  }\n}\nfetchHNAgents();`,
      metrics: {
        time: "1.8s",
        models: "M2 Router -> CodeGen v2",
        confidence: "99.2%"
      }
    },
    {
      title: "Cloud Cost Audit",
      query: "DB CPU is hovering at 90%, API latency spikes to 1.2s. Walk me through index diagnostics.",
      routing: "Needs high-reasoning database evaluation and bottleneck diagnostics.",
      analysis: "Detect metrics: DB CPU 90%, latency 1.2s. Identify database connection pool saturation risk and query plans.",
      planning: "Plan execution turns: 1) Pull database connection logs, 2) Execute EXPLAIN ANALYZE simulator on slow operations, 3) Check index state.",
      search: "Retrieved database traces: 12 sequential sequential scans detected on profiles table during filters.",
      tool: "Invoked SQL Optimizer agent. Map index requirements for user queries.",
      reasoning: "High CPU suggests sequential scans are bypassing key columns. Latency spikes due to thread pool queueing behind unindexed queries.",
      verification: "Verification: Validates SQL index syntax for Postgres concurrency requirements. Ensure rollback commands are available.",
      response: "The diagnostic logs isolate the bottleneck to missing indices on your filter tables. Execute this migration script to resolve the lockups...",
      code: `-- Concurrent index creation to prevent table locks\nCREATE INDEX CONCURRENTLY idx_profiles_last_active \nON public.profiles(last_active) \nWHERE last_active IS NOT NULL;\n\n-- Recommended: connection pool adjustments\nALTER SYSTEM SET max_connections = 250;`,
      metrics: {
        time: "2.4s",
        models: "M2 Reasoning -> DBAgent",
        confidence: "97.8%"
      }
    }
  ];

  const startSimulation = (index: number) => {
    if (simInterval.current) clearInterval(simInterval.current);
    setSimIndex(index);
    setSimStep(0);
    setIsSimulating(true);

    let step = 0;
    simInterval.current = setInterval(() => {
      step++;
      if (step <= 8) {
        setSimStep(step);
      } else {
        if (simInterval.current) clearInterval(simInterval.current);
        setIsSimulating(false);
      }
    }, 1200);
  };

  useEffect(() => {
    startSimulation(0);
    return () => {
      if (simInterval.current) clearInterval(simInterval.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-screen bg-[#050510] text-white/90 selection:bg-[#ff6b57]/30 selection:text-white"
    >
      {/* Ambient Gradient Beam Following Cursor */}
      <div
        className="pointer-events-none absolute -inset-px opacity-20 transition-opacity duration-300 z-10 hidden md:block"
        style={{
          background: `radial-gradient(600px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(255, 107, 87, 0.12), transparent 80%)`,
        }}
      />

      {/* Background Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[10%] w-[600px] h-[600px] rounded-full bg-[#ff6b57]/8 blur-[120px] animate-pulse" style={{ animationDuration: "12s" }} />
        <div className="absolute top-[35%] right-[5%] w-[500px] h-[500px] rounded-full bg-[#f5c77e]/6 blur-[150px]" />
        <div className="absolute bottom-[10%] left-[5%] w-[700px] h-[700px] rounded-full bg-[#ff6b57]/5 blur-[180px]" />
      </div>

      {/* HERO SECTION */}
      <section className="relative px-6 pt-16 pb-12 md:px-10 md:pt-24 md:pb-16 text-center flex flex-col items-center max-w-6xl mx-auto">
        {/* Breathing animated Sun-M SVG Mark */}
        <div className="relative mb-6 group">
          <div className="absolute inset-0 bg-[#ff6b57]/20 rounded-full blur-2xl group-hover:bg-[#ff6b57]/30 transition-all duration-700" />
          <motion.div
            animate={{
              scale: [1, 1.04, 1],
              rotate: [0, 0.8, -0.8, 0]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="relative"
          >
            <svg width="110" height="110" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="sunGradientMain" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fff5e6" />
                  <stop offset="60%" stopColor="#ff6b57" />
                  <stop offset="100%" stopColor="#e85a48" />
                </radialGradient>
                <linearGradient id="rayGradientMain" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f5c77e" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ff6b57" stopOpacity="0.15" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r="44" stroke="url(#rayGradientMain)" strokeWidth="1" strokeDasharray="3 5" className="animate-spin" style={{ animationDuration: "50s" }} />
              <circle cx="60" cy="60" r="25" fill="url(#sunGradientMain)" />
              <path d="M44 78 L52 49 L60 62" stroke="#f5c77e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M76 78 L68 49 L60 62" stroke="#f5c77e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="60" cy="62" r="2.5" fill="#fff" />
            </svg>
          </motion.div>
        </div>

        {/* Vision Header */}
        <p className="text-xs font-semibold tracking-[0.25em] uppercase text-[#ff8a7a] mb-4">
          InnovateAegis Flagship AI Platform
        </p>

        <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl md:text-8xl leading-[1.05] text-white">
          Manavya
        </h1>
        
        <p className="mt-3 text-2xl md:text-3xl font-medium tracking-wide bg-gradient-to-r from-[#ff6b57] via-[#ff8a7a] to-[#f5c77e] bg-clip-text text-transparent">
          Intelligence born of creation.
        </p>

        <p className="mt-6 max-w-2xl text-base md:text-lg leading-7 text-white/60">
          One AI platform that thinks, researches, plans, writes, codes, creates, and collaborates. 
          Powered by the M2 intelligence engine.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a
            href="https://manavya.innovativeaegis.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center rounded-full bg-gradient-to-r from-[#ff6b57] to-[#e85a48] px-8 py-3.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(255,107,87,0.25)] hover:shadow-[0_0_36px_rgba(255,107,87,0.4)] transition-all hover:-translate-y-0.5"
          >
            Start Using Manavya
            <ArrowRightIcon />
          </a>
          <a
            href="#playground"
            className="rounded-full border border-white/10 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white/95 transition-colors hover:bg-white/10"
          >
            Watch it Think
          </a>
        </div>
      </section>

      {/* LIVE BETA BANNER SECTION */}
      <section className="px-6 py-6 md:px-10 max-w-4xl mx-auto">
        <div className="relative rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-6 md:p-8 overflow-hidden backdrop-blur-md">
          {/* Decorative Corner Lights */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-emerald-400">
                Now Available
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
                Manavya M2 Beta
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-xs md:text-sm text-white/70">
                <div className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-400" />
                  <span>Unlimited usage</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-400" />
                  <span>Free access</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-400" />
                  <span>Powered by M2</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-400" />
                  <span>Updates every week</span>
                </div>
              </div>
            </div>
            
            <a
              href="https://manavya.innovativeaegis.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full md:w-auto text-center rounded-full bg-emerald-500 px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-950 transition-all hover:bg-emerald-400 hover:scale-105 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              Start Building
            </a>
          </div>
        </div>
      </section>

      {/* WHAT IS MANAVYA (OUTCOMES) SECTION */}
      <section className="px-6 py-12 md:px-10 md:py-20 max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#ff8a7a]">Core Purpose</p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            A single space for operational outcomes.
          </h2>
          <p className="mt-4 text-sm md:text-base leading-6 text-white/60">
            AI should not be a passive chat interface. Manavya consolidates critical thinking processes to help you solve problems, write production scripts, search the live web, and organize workspaces.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Thinks & Plans", desc: "Formulates objective reasoning pathways, mapping execution strategies step-by-step." },
            { title: "Researches", desc: "Queries live data feeds, aggregates knowledge base fragments, and filters noise." },
            { title: "Writes & Codes", desc: "Constructs clean script patterns, designs interfaces, and inspects files." },
            { title: "Creates", desc: "Supports multimodal creation layers to produce high-fidelity imagery and designs." },
            { title: "Collaborates", desc: "Invites agents into long-running tasks, maintaining context across timelines." },
            { title: "Verifies", desc: "Runs defensive validation on generated outcomes to filter errors before deployment." }
          ].map((item, idx) => (
            <div key={item.title} className="enterprise-glass rounded-xl border border-white/5 p-5 relative overflow-hidden group">
              {/* Illumination Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#ff6b57]/5 to-[#f5c77e]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <h3 className="text-lg font-bold text-white relative z-10">{item.title}</h3>
              <p className="mt-2 text-xs leading-5 text-white/60 relative z-10">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PLAYGROUND SIMULATOR SECTION */}
      <section id="playground" className="px-6 py-12 md:px-10 md:py-20 max-w-6xl mx-auto">
        <div className="grid gap-10 lg:grid-cols-12 items-stretch">
          {/* Left panel: Info */}
          <div className="lg:col-span-5 flex flex-col justify-center text-center lg:text-left">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#ff8a7a]">Interactive Engine</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-5xl">
              Live Execution Simulator
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/60">
              Select an objective to observe how the M2 cognitive routing pipeline analyzes intents, outlines tasks, triggers integrations, and runs validation constraints.
            </p>

            <div className="mt-8 flex flex-col gap-3 max-w-sm mx-auto lg:mx-0">
              {simulations.map((sim, i) => (
                <button
                  key={sim.title}
                  onClick={() => startSimulation(i)}
                  disabled={isSimulating && simIndex === i}
                  className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                    simIndex === i
                      ? "border-[#ff6b57] bg-[#ff6b57]/5 text-white shadow-[0_0_15px_rgba(255,107,87,0.1)]"
                      : "border-white/10 bg-white/[0.02] text-white/50 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <span className="text-sm font-semibold">{sim.title}</span>
                  <PlayIcon />
                </button>
              ))}
            </div>
          </div>

          {/* Right panel: Terminal Simulator */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="flex-1 rounded-2xl border border-white/10 bg-[#09091b] shadow-2xl overflow-hidden flex flex-col justify-between">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/[0.01]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex items-center gap-2">
                  <TerminalIcon />
                  <span className="text-[10px] font-bold tracking-wider text-white/40 uppercase font-mono">Cognitive-Run-Trace</span>
                </div>
                <div className="w-10" />
              </div>

              {/* Body */}
              <div className="p-5 font-mono text-xs md:text-sm space-y-4 text-white/70 min-h-[380px] flex-1 flex flex-col justify-between">
                <div>
                  {/* Step 0: User Query */}
                  <div className="flex items-start gap-2">
                    <span className="text-[#ff6b57] font-bold select-none">&gt;</span>
                    <span className="text-white font-medium">{simulations[simIndex].query}</span>
                  </div>

                  {/* Pipeline Step 1: Objective Analysis */}
                  <AnimatePresence>
                    {simStep >= 1 && (
                      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 pl-3 border-l-2 border-[#ff6b57]/40">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-[#ff8a7a]">1. Objective Analysis</div>
                        <div className="mt-0.5 text-white/90">{simulations[simIndex].analysis}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Pipeline Step 2: Routing */}
                  <AnimatePresence>
                    {simStep >= 2 && (
                      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 pl-3 border-l-2 border-[#ff8a7a]/40">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-[#ff8a7a]">2. Cognitive Route</div>
                        <div className="mt-0.5 text-white/90 font-medium">{simulations[simIndex].routing}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Pipeline Step 3: Planning */}
                  <AnimatePresence>
                    {simStep >= 3 && (
                      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 pl-3 border-l-2 border-[#f5c77e]/40">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-[#f5c77e]">3. Task Planning</div>
                        <div className="mt-0.5 text-white/70">{simulations[simIndex].planning}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Pipeline Step 4: Knowledge Search */}
                  <AnimatePresence>
                    {simStep >= 4 && (
                      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 pl-3 border-l-2 border-cyan-400/40">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-cyan-400">4. Knowledge Search</div>
                        <div className="mt-0.5 text-white/70">{simulations[simIndex].search}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Pipeline Step 5: Tool Selection */}
                  <AnimatePresence>
                    {simStep >= 5 && (
                      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 pl-3 border-l-2 border-purple-400/40">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-purple-400">5. Tool Selection</div>
                        <div className="mt-0.5 text-white/70">{simulations[simIndex].tool}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Pipeline Step 6: Reasoning */}
                  <AnimatePresence>
                    {simStep >= 6 && (
                      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 pl-3 border-l-2 border-blue-400/40">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-blue-400">6. Reasoning Loop</div>
                        <div className="mt-0.5 text-white/80">{simulations[simIndex].reasoning}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Pipeline Step 7: Verification */}
                  <AnimatePresence>
                    {simStep >= 7 && (
                      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 pl-3 border-l-2 border-emerald-400/40">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                          <CheckIcon className="w-3 h-3 text-emerald-400" />
                          7. M2 Output Verification
                        </div>
                        <div className="mt-0.5 text-emerald-400/90 font-medium">{simulations[simIndex].verification}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Pipeline Step 8: Response Block */}
                <AnimatePresence>
                  {simStep >= 8 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-[#ff8a7a] mb-1.5">8. Verified Response</div>
                      <p className="text-white/90 leading-relaxed mb-3">{simulations[simIndex].response}</p>
                      <pre className="p-3 rounded bg-[#03030b] text-cyan-300 text-[10px] overflow-x-auto border border-white/5 leading-normal font-mono">
                        <code>{simulations[simIndex].code}</code>
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Sidebar Metrics Footer */}
              <div className="border-t border-white/10 px-5 py-3.5 bg-white/[0.01] grid grid-cols-3 gap-2 text-[10px] font-mono text-white/50">
                <div>
                  <span className="block text-white/30 uppercase text-[8px] font-bold">Execution Time</span>
                  <span className="text-[#ff8a7a] font-bold">{simulations[simIndex].metrics.time}</span>
                </div>
                <div>
                  <span className="block text-white/30 uppercase text-[8px] font-bold">Cognitive Layer</span>
                  <span className="text-white/80">{simulations[simIndex].metrics.models}</span>
                </div>
                <div>
                  <span className="block text-white/30 uppercase text-[8px] font-bold">Safety Confidence</span>
                  <span className="text-emerald-400 font-bold">{simulations[simIndex].metrics.confidence}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY MANAVYA (COMPARISON) SECTION */}
      <section className="px-6 py-12 md:px-10 md:py-20 max-w-5xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#ff8a7a]">Differentiators</p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-5xl">
            Why Manavya
          </h2>
          <p className="mt-4 text-sm leading-6 text-white/60">
            Traditional AI models respond statically. Manavya coordinates tools, verifies logic, and tracks workspace memory autonomously.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full border-collapse text-left text-xs md:text-sm">
            <thead className="bg-white/5 text-white/90">
              <tr>
                <th className="px-5 py-4 font-bold border-r border-white/5">Capability</th>
                <th className="px-5 py-4 font-bold text-white/50 border-r border-white/5">Traditional AI</th>
                <th className="px-5 py-4 font-bold text-[#ff8a7a] bg-[#ff6b57]/5">Manavya AI</th>
              </tr>
            </thead>
            <tbody className="bg-[#07071c]/50 text-white/70">
              <tr className="border-t border-white/10">
                <td className="px-5 py-4 font-bold text-white border-r border-white/5">Model Architecture</td>
                <td className="px-5 py-4 border-r border-white/5">Single static LLM weight set</td>
                <td className="px-5 py-4 text-white font-medium bg-[#ff6b57]/5">Intelligent cognitive routing</td>
              </tr>
              <tr className="border-t border-white/10">
                <td className="px-5 py-4 font-bold text-white border-r border-white/5">Response Strategy</td>
                <td className="px-5 py-4 border-r border-white/5">One instant, direct generated guess</td>
                <td className="px-5 py-4 text-white font-medium bg-[#ff6b57]/5">Thorough planning & validation loop</td>
              </tr>
              <tr className="border-t border-white/10">
                <td className="px-5 py-4 font-bold text-white border-r border-white/5">Transparency</td>
                <td className="px-5 py-4 border-r border-white/5">Black box text output</td>
                <td className="px-5 py-4 text-white font-medium bg-[#ff6b57]/5">Traceable pipeline decision logs</td>
              </tr>
              <tr className="border-t border-white/10">
                <td className="px-5 py-4 font-bold text-white border-r border-white/5">Product Surface</td>
                <td className="px-5 py-4 border-r border-white/5">Text-based chat overlays</td>
                <td className="px-5 py-4 text-white font-medium bg-[#ff6b57]/5">Integrated collaborative workspaces</td>
              </tr>
              <tr className="border-t border-white/10">
                <td className="px-5 py-4 font-bold text-white border-r border-white/5">System Evolution</td>
                <td className="px-5 py-4 border-r border-white/5">Static weights until next training cycle</td>
                <td className="px-5 py-4 text-white font-medium bg-[#ff6b57]/5">Continuous feedback loops</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FUTURE CAPABILITIES (PRODUCT PORTFOLIO ECOSYSTEM) */}
      <section className="px-6 py-12 md:px-10 md:py-20 bg-[#07071c]/40 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#ff8a7a]">Ecosystem</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-5xl">
              Specialized Workspaces
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/60">
              The Manavya platform exposes distinct product surfaces optimized for targeted professional tracks.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Playground",
                desc: "Run rapid testing models, query raw API integrations, and inspect execution pipeline parameters.",
                status: "LIVE",
                active: true,
                color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              },
              {
                title: "Code",
                desc: "Advanced software engineering assistant with repository-wide context. Refactors, reviews, and debugs code.",
                status: "Coming Soon",
                active: false,
                color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
              },
              {
                title: "Cowork",
                desc: "Persistent AI project space. Keeps track of team goals, changes, decisions, and documents asynchronously.",
                status: "Coming Soon",
                active: false,
                color: "bg-purple-500/10 text-purple-400 border-purple-500/20"
              },
              {
                title: "Voice Mode",
                desc: "Ambient, low-latency audio overlay. Engage in continuous spoken loops with screen-aware assistance.",
                status: "Coming Soon",
                active: false,
                color: "bg-amber-500/10 text-amber-400 border-amber-500/20"
              },
              {
                title: "Multimodal Generation",
                desc: "High-fidelity generation layers producing user interface mockups, SVG vector art, and cinematic video loops.",
                status: "Coming Soon",
                active: false,
                color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
              },
              {
                title: "Enterprise Workspace",
                desc: "Central organization console with unified security boundaries, safety audits, and team access rules.",
                status: "Coming Soon",
                active: false,
                color: "bg-white/10 text-white/60 border-white/10"
              }
            ].map((p) => (
              <div key={p.title} className="enterprise-glass rounded-xl border border-white/10 p-6 flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-xl font-bold text-white">{p.title}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${p.color}`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-white/60">{p.desc}</p>
                </div>
                {p.active ? (
                  <a
                    href="https://manavya.innovativeaegis.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex items-center text-xs font-semibold uppercase tracking-wider text-[#ff8a7a] hover:text-white transition-colors"
                  >
                    Open Playground
                    <ExternalLinkIcon />
                  </a>
                ) : (
                  <span className="mt-6 text-[10px] font-semibold uppercase tracking-wider text-white/30 cursor-default">
                    Development Stage
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POWERED BY M2 SECTION */}
      <section className="px-6 py-16 md:px-10 md:py-24 max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#ff8a7a]">The Core Engine</p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-5xl">
            Powered by M2
          </h2>
          <p className="mt-4 text-sm leading-6 text-white/60">
            M2 is the cognitive orchestration layer running behind all Manavya workspaces, determining routes, coordinating operations, and executing constraints.
          </p>
        </div>

        {/* Technical Architecture Specs (Visual Spec Cards) */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "M2 Cognitive Routing",
              desc: "Automatically classifies query complexity and intent parameters, routing inputs to targeted inference weights."
            },
            {
              title: "Verified Traces",
              desc: "Logs every turn trace to database records, ensuring total auditability and transparency of the reasoning path."
            },
            {
              title: "Constitutional Safety",
              desc: "Safety-first execution boundaries that audit output constraints without slowing inference speed."
            },
            {
              title: "Memory Core",
              desc: "Maintains persistent context schemas and profile memories across multiple conversation tracks."
            }
          ].map((card) => (
            <div key={card.title} className="enterprise-glass rounded-xl border border-white/5 p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white border-b border-white/5 pb-3">{card.title}</h3>
                <p className="mt-3 text-xs leading-5 text-white/50">{card.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TRUST NUMBERS GRID */}
      <section className="px-6 py-10 md:px-10 max-w-5xl mx-auto border-t border-white/5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { label: "Powered by", val: "M2 Core" },
            { label: "Unlimited Usage", val: "100%" },
            { label: "Current Cost", val: "Free" },
            { label: "Response Trace", val: "Visible" }
          ].map((metric) => (
            <div key={metric.label} className="p-4">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-white/40">{metric.label}</span>
              <span className="block text-xl md:text-2xl font-black text-white mt-1">{metric.val}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ROADMAP TIMELINE SECTION */}
      <section className="px-6 py-12 md:px-10 md:py-20 max-w-4xl mx-auto border-t border-white/5">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#ff8a7a]">Roadmap</p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-5xl">
            Product Timeline
          </h2>
        </div>

        <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10 pl-8">
          {/* Today */}
          <div className="relative">
            <span className="absolute -left-10 top-1 h-4.5 w-4.5 rounded-full bg-[#ff6b57] border-4 border-[#050510]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#ff8a7a]">Today</h3>
            <div className="mt-2 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 max-w-xl">
              <h4 className="font-bold text-white flex items-center gap-1.5 text-xs md:text-sm">
                <CheckIcon className="w-3.5 h-3.5" />
                Playground Environment Live
              </h4>
              <p className="mt-1 text-xs text-white/50">Free unlimited conversational beta using the M2 engine.</p>
            </div>
          </div>

          {/* Coming Soon */}
          <div className="relative">
            <span className="absolute -left-10 top-1 h-4.5 w-4.5 rounded-full bg-white/20 border-4 border-[#050510]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/40">Coming Soon</h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 max-w-2xl">
              {[
                { title: "Code & Reasoning", desc: "Project-aware developer assistance." },
                { title: "Multimodal Generation", desc: "High-fidelity design & assets builder." },
                { title: "Cowork Spaces", desc: "Shared workspaces for long-running goals." },
                { title: "Voice Mode", desc: "Ambient audio screen-aware interface." },
                { title: "Enterprise Workspace", desc: "Secure multi-user permissions console." }
              ].map((item) => (
                <div key={item.title} className="p-3.5 rounded-xl border border-white/5 bg-white/[0.01]">
                  <h5 className="font-semibold text-white/90 text-xs">{item.title}</h5>
                  <p className="mt-0.5 text-[11px] text-white/50">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FOUNDER PHILOSOPHY SECTION */}
      <section className="px-6 py-12 md:px-10 md:py-20 max-w-3xl mx-auto text-center border-t border-white/5">
        <div className="relative">
          <span className="absolute top-[-40px] left-1/2 -translate-x-1/2 text-8xl font-serif text-[#ff6b57]/10 select-none pointer-events-none">“</span>
          <p className="text-lg md:text-2xl font-medium leading-relaxed italic text-white/80 relative z-10">
            “We believe AI shouldn't be a black box. Every response should think. Every answer should explain. Every capability should empower creation.”
          </p>
          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[#ff8a7a]">Founder Philosophy</p>
            <p className="text-[11px] text-white/40 mt-1">InnovateAegis Product Team</p>
          </div>
        </div>
      </section>

      {/* FINAL FOOTER CTA SECTION */}
      <section className="px-6 pb-20 pt-6 md:px-10 md:pb-28">
        <div className="relative mx-auto w-full max-w-4xl rounded-2xl border border-[#ff6b57]/15 bg-gradient-to-br from-[#ff6b57]/10 via-white/[0.01] to-[#f5c77e]/5 p-8 md:p-12 text-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(400px_circle_at_center,rgba(255,107,87,0.06),transparent)]" />
          <div className="relative z-10">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Ready to experience Manavya?
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-xs md:text-sm text-white/60">
              Start building today. Run operations, test prompts, and audit traces inside the M2 beta dashboard.
            </p>
            <div className="mt-8 flex justify-center">
              <a
                href="https://manavya.innovativeaegis.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center rounded-full bg-white px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-950 transition-all hover:bg-white/90 hover:scale-105"
              >
                Use Manavya Free
                <ArrowRightIcon />
              </a>
            </div>
            <p className="mt-4 text-[10px] text-white/40 font-mono">
              manavya.innovativeaegis.com
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

// Minimal Terminal icon wrapper
function TerminalIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
