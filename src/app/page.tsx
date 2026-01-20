"use client";

import {
  ArrowUpRight,
  FileText,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";

import { UniversalSearch } from "@/features/search";

// Stats data
const stats = [
  { id: "total-variants", value: "8.9B", label: "TOTAL VARIANTS" },
  { id: "possible-snvs", value: "8.8B", label: "POSSIBLE SNVS" },
  { id: "observed-indels", value: "80M", label: "OBSERVED INDELS" },
];

// Quick search examples
const quickSearches = ["BRCA1", "rs7412", "chr1:1000-2000"];

export default function HomePage() {
  return (
    <div className="min-h-screen relative overflow-hidden text-slate-900 selection:bg-purple-100 selection:text-purple-900">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-100/40 blur-[150px] mix-blend-multiply opacity-60"></div>
        <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-100/40 blur-[150px] mix-blend-multiply opacity-60"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150"></div>
      </div>

      <main className="relative z-10 pt-32 sm:pt-24 pb-32 px-6 sm:px-8 lg:px-12 max-w-[1400px] mx-auto flex flex-col items-center">
        <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Hero Section */}
          <div className="text-center max-w-4xl mx-auto relative">
            {/* Badge
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center px-5 py-2 rounded-full bg-white border border-slate-200/60 shadow-sm shadow-slate-200/50 backdrop-blur-md">
                <span className="flex h-2.5 w-2.5 relative mr-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Functional Annotation Resource
                </span>
              </div>
            </div> */}

            {/* Main Heading */}
            <h1 className="text-6xl sm:text-7xl md:text-8xl font-semibold text-slate-900 tracking-tighter mb-8 leading-[1.05]">
              Functional Annotation of Variants <br />
              <span className="text-transparent bg-clip-text bg-linear-to-br from-violet-700 via-purple-700 to-fuchsia-700">
                Online Resource
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-slate-500 max-w-3xl mx-auto leading-relaxed tracking-tight font-light">
              An open-access portal for whole genome sequencing variant
              annotation. Precision at the speed of thought.
            </p>
          </div>

          {/* Search Component */}
          <div className="w-full max-w-4xl mt-16 mb-20">
            <UniversalSearch />
          </div>

          {/* Stats */}
          <StatsTicker />

          {/* Divider */}
          <div className="w-full max-w-xs mx-auto border-t border-slate-200 my-24"></div>

          {/* Batch Annotation Section */}
          <div className="w-full max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">
                Batch Processing
              </h2>
              <p className="text-slate-500 text-xl max-w-xl mx-auto">
                Upload VCF or CSV files for large-scale annotation.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Documentation Card */}
              <div className="bg-white rounded-[2.5rem] p-12 shadow-2xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between h-[500px] relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-8 text-slate-900">
                    <FileText className="w-7 h-7" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">
                    Documentation & Specs
                  </h3>
                  <p className="text-slate-500 text-lg leading-relaxed pr-8">
                    Review the file formatting guidelines to ensure perfect
                    parsing of your variant data.
                  </p>
                </div>
                <div className="relative z-10 pt-8">
                  <Link
                    href="/about"
                    className="text-base font-semibold text-slate-900 flex items-center gap-2 hover:gap-3 transition-all"
                  >
                    Read Documentation <ArrowUpRight className="w-5 h-5" />
                  </Link>
                </div>
                {/* Decoration */}
                <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-purple-50 rounded-full blur-3xl opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
              </div>

              {/* Upload Card */}
              <Link
                href="/batch-annotation"
                className="bg-slate-900 text-white rounded-[2.5rem] p-12 shadow-2xl shadow-purple-900/20 flex flex-col items-center justify-center text-center h-[500px] relative overflow-hidden cursor-pointer group transition-transform hover:scale-[1.01] duration-300"
              >
                <div className="absolute inset-0 bg-linear-to-br from-slate-900 to-purple-900 opacity-50"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>

                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300 border border-white/10">
                    <UploadCloud className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold mb-3 tracking-tight">
                    Upload Dataset
                  </h3>
                  <p className="text-slate-400 text-lg mb-10 max-w-sm">
                    Drag & drop your VCF file here, or click to browse.
                  </p>
                  <span className="inline-flex px-5 py-2.5 rounded-full bg-white/10 border border-white/5 text-sm font-medium backdrop-blur-md">
                    Max file size: 50MB
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Stats Ticker Component
function StatsTicker() {
  return (
    <div className="flex flex-wrap justify-center items-center gap-y-10">
      {stats.map((stat, index) => (
        <div key={stat.id} className="flex items-center">
          {index > 0 && (
            <div className="h-16 w-px bg-slate-200 mx-8 md:mx-16 hidden sm:block" />
          )}
          <div className="text-center px-6 sm:px-0">
            <div className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight mb-2">
              {stat.value}
            </div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {stat.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
