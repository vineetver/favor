"use client";

import { cn } from "@infra/utils";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { CopyInstallCommand } from "./copy-install-command";

const capabilities = [
  {
    title: "Ingest any format",
    body: "WGS VCF, variant lists, credible sets, TSV, CSV, Parquet. Normalize once, get a clean variant table.",
  },
  {
    title: "Annotate locally",
    body: "Up to 54 functional annotation columns across all 24 chromosomes. Pathogenicity, frequency, conservation, regulatory scores. Runs on your hardware.",
  },
  {
    title: "Add tissue context",
    body: "eQTL, sQTL, apaQTL across 50 tissues, ChromBPNet predictions, enhancer-gene links. See where your variants act.",
  },
  {
    title: "Rare-variant association testing",
    body: "STAAR single-study analysis: Burden, SKAT, ACAT-V, STAAR-O. Bring your genotypes, phenotypes, and covariates.",
  },
  {
    title: "Cross-biobank meta-analysis",
    body: "MetaSTAAR for combining rare-variant results across multiple biobanks using summary statistics. No individual-level data sharing needed.",
  },
];

const roadmap = [
  { name: "Interpretation", detail: "Score each variant for pathogenicity, map it to a target gene and tissue through enhancer-gene links and eQTL colocalization, layer in functional validation from CRISPRi and MPRA screens, and assign a confidence tier" },
  { name: "Quality Control", detail: "Flag problematic samples and variants before analysis" },
  { name: "Reporting", detail: "Generate publication-ready plots: Manhattan, QQ, locus zoom, tissue heatmaps" },
];

const dataPacks = [
  { name: "FAVOR Base", size: "200 GB", contents: "40 curated columns: pathogenicity, frequency, clinical, conservation, regulatory, aPC STAAR channels" },
  { name: "FAVOR Full", size: "508 GB", contents: "All 54 annotation columns including dbNSFP, ENCODE, MaveDB, COSMIC" },
  { name: "eQTL", size: "3 GB", contents: "GTEx v10 eQTL/sQTL/apaQTL, 50 tissues, SuSiE fine-mapped" },
  { name: "Single-cell eQTL", size: "48 GB", contents: "OneK1K, DICE, PsychENCODE" },
  { name: "Regulatory", size: "18 GB", contents: "cCRE tissue signals, chromatin states, accessibility" },
  { name: "Enhancer-Gene", size: "12 GB", contents: "ABC, EPIraction, rE2G, EpiMap, CRISPRi" },
  { name: "Tissue Scores", size: "5 GB", contents: "ChromBPNet, allelic imbalance" },
];

export default function CLIPage() {
  return (
    <div className="min-h-screen relative overflow-hidden text-foreground selection:bg-purple-100 selection:text-purple-900">
      {/* Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-100/30 blur-[150px] mix-blend-multiply opacity-50" />
        <div className="absolute top-[30%] right-[-5%] w-[40%] h-[40%] rounded-full bg-purple-100/30 blur-[150px] mix-blend-multiply opacity-50" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150" />
      </div>

      <main className="relative z-10">
        {/* Hero */}
        <section className="pt-36 sm:pt-44 pb-24 px-6 sm:px-8 lg:px-12 max-w-page mx-auto">
          <div className="max-w-4xl mx-auto text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight leading-[1.08]">
              Whole genome analysis
              <br />
              <span className="text-transparent bg-clip-text bg-linear-to-br from-violet-700 via-purple-700 to-fuchsia-700">
                from your terminal
              </span>
            </h1>

            <p className="mt-8 text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light tracking-tight">
              Annotate, enrich, and run rare-variant association tests on whole
              genomes. No pipeline assembly required.
            </p>

            <CopyInstallCommand />

            <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="https://github.com/vineetver/favor-cli"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center gap-2 px-6 py-3 rounded-full",
                  "bg-foreground text-background text-sm font-semibold",
                  "hover:bg-foreground/90 transition-colors",
                  "shadow-lg shadow-foreground/10",
                )}
              >
                GitHub
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link
                href="/docs"
                className={cn(
                  "inline-flex items-center gap-2 px-6 py-3 rounded-full",
                  "border border-border text-sm font-semibold text-foreground",
                  "hover:bg-muted transition-colors",
                )}
              >
                Documentation
              </Link>
            </div>
          </div>
        </section>

        {/* Pipeline Steps */}
        <section className="py-24 px-6 sm:px-8 lg:px-12 max-w-page mx-auto">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-4">
              {capabilities.map((cap, i) => (
                <div
                  key={cap.title}
                  className={cn(
                    "rounded-2xl border border-border p-8 sm:p-10",
                    "bg-card/60 backdrop-blur-sm",
                    "hover:border-primary/20 transition-colors duration-300",
                  )}
                >
                  <div className="flex items-start gap-6 sm:gap-10">
                    <div className="shrink-0">
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div>
                      <p className="text-foreground font-semibold text-lg tracking-tight">
                        {cap.title}
                      </p>
                      <p className="mt-2 text-muted-foreground leading-relaxed max-w-xl">
                        {cap.body}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-xs mx-auto border-t border-border" />

        {/* Data Packs */}
        <section className="py-24 px-6 sm:px-8 lg:px-12 max-w-page mx-auto">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-center mb-4">
              Download what you need
            </h2>
            <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-16">
              From tissue-specific regulatory data to the full 508 GB annotation database.
            </p>

            <div className="overflow-x-auto rounded-2xl border border-border bg-card/60 backdrop-blur-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-6 font-semibold text-foreground">Pack</th>
                    <th className="text-left py-4 px-6 font-semibold text-foreground">Size</th>
                    <th className="text-left py-4 px-6 font-semibold text-foreground">Contents</th>
                  </tr>
                </thead>
                <tbody>
                  {dataPacks.map((pack, i) => (
                    <tr
                      key={pack.name}
                      className={cn(
                        i < dataPacks.length - 1 && "border-b border-border",
                      )}
                    >
                      <td className="py-3.5 px-6 font-medium text-foreground whitespace-nowrap">
                        {pack.name}
                      </td>
                      <td className="py-3.5 px-6 text-muted-foreground whitespace-nowrap tabular-nums">
                        {pack.size}
                      </td>
                      <td className="py-3.5 px-6 text-muted-foreground">
                        {pack.contents}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <div className="max-w-xs mx-auto border-t border-border" />

        {/* AI Agents */}
        <section className="py-24 px-6 sm:px-8 lg:px-12 max-w-page mx-auto">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-center mb-4">
              Built for AI agents
            </h2>
            <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-16">
              Every command outputs structured JSON. Point an AI agent like
              Claude at your genome data and let it run the entire analysis,
              interpret the results, and surface what matters.
            </p>

            <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-8 sm:p-10">
              <div className="space-y-6">
                <div>
                  <p className="text-foreground font-semibold text-lg tracking-tight">
                    Automated functional genomics
                  </p>
                  <p className="mt-2 text-muted-foreground leading-relaxed max-w-2xl">
                    An AI agent can take a VCF, annotate it, enrich with tissue
                    data, run association tests, and write up which variants are
                    likely causal, which genes they affect, and in which tissues.
                    What takes a bioinformatician days becomes a single conversation.
                  </p>
                </div>
                <div className="border-t border-border pt-6">
                  <p className="text-foreground font-semibold text-lg tracking-tight">
                    Works with Claude Code, Cursor, or any coding agent
                  </p>
                  <p className="mt-2 text-muted-foreground leading-relaxed max-w-2xl">
                    The CLI ships with an{" "}
                    <Link
                      href="https://github.com/vineetver/favor-cli/blob/master/AGENTS.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      agent reference
                    </Link>
                    {" "}that describes every command, its inputs and outputs, so
                    agents know exactly what to call and how to read the results.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-xs mx-auto border-t border-border" />

        {/* Roadmap */}
        <section className="py-24 px-6 sm:px-8 lg:px-12 max-w-page mx-auto">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-center mb-4">
              What&apos;s coming
            </h2>
            <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-16">
              The goal is to replace entire bioinformatics workflows with single commands.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {roadmap.map((item) => (
                <div
                  key={item.name}
                  className={cn(
                    "rounded-2xl border border-dashed border-border/80 p-6",
                    "bg-muted/20",
                  )}
                >
                  <p className="text-sm font-semibold text-foreground mb-1">
                    {item.name}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Video placeholder */}
        <section className="pb-12 px-6 sm:px-8 lg:px-12 max-w-page mx-auto">
          <div className="max-w-4xl mx-auto">
            <div
              className={cn(
                "rounded-[2rem] border border-border overflow-hidden",
                "bg-foreground relative group cursor-pointer",
                "aspect-video flex items-center justify-center",
                "shadow-2xl shadow-foreground/10",
              )}
            >
              <div className="absolute inset-0 bg-linear-to-br from-foreground to-purple-900 opacity-60" />
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />
              <div className="relative z-10 text-center text-white">
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-white/70">
                  Walkthrough coming soon
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-24 px-6 sm:px-8 lg:px-12 max-w-page mx-auto">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
              Try it
            </h2>
            <p className="text-lg text-muted-foreground mb-10">
              One command to install. Open source. Free.
            </p>
            <CopyInstallCommand />
          </div>
        </section>
      </main>
    </div>
  );
}
