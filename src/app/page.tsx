'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mic, Brain, Shield, BarChart3, Globe, ArrowRight, CheckCircle, Sparkles } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, delay: i * 0.12, ease: 'easeOut' as const },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } },
};

const features = [
  {
    icon: Mic,
    title: 'Voice Interviews',
    desc: 'Natural voice-based Q&A with real-time recording & AI-generated voice questions',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    icon: Brain,
    title: 'AI Evaluation',
    desc: 'Groq-powered scoring with detailed analysis, strengths, risks & hiring recommendations',
    gradient: 'from-indigo-500 to-blue-600',
  },
  {
    icon: Shield,
    title: 'Anti-Cheat',
    desc: 'Tab-switch detection & automatic termination for interview integrity',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    desc: 'Real-time dashboard with score distributions and candidate pipeline overview',
    gradient: 'from-blue-500 to-cyan-600',
  },
  {
    icon: Globe,
    title: 'Multi-Tenant',
    desc: 'Organization-level isolation with role-based access control',
    gradient: 'from-purple-500 to-pink-600',
  },
];

export default function Home() {
  return (
    <div className="relative z-10 min-h-screen">
      {/* ====== HEADER ====== */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-5"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/25">
            <span className="text-sm font-bold text-white">AI</span>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-400 to-indigo-400 opacity-0 blur-sm transition-opacity duration-500 group-hover:opacity-40" />
          </div>
          <span className="font-semibold text-white text-lg tracking-tight">Interview</span>
        </div>
        <Link
          href="/admin/login"
          className="group relative flex items-center gap-2 text-sm text-white/50 hover:text-white transition-all duration-300 px-4 py-2 rounded-xl border border-transparent hover:border-white/10 hover:bg-white/[0.04]"
        >
          Admin Dashboard
          <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
        </Link>
      </motion.header>

      {/* ====== HERO SECTION ====== */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-32 pt-20 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/[0.08] px-5 py-2 text-xs font-medium text-violet-300 tracking-wide shadow-[0_0_20px_rgba(124,58,237,0.15)]"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI-Powered Interview Platform
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="mb-6 text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.1]"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.span variants={fadeUp} custom={0} className="inline-block">
            Hire smarter with{' '}
          </motion.span>
          <motion.span
            variants={fadeUp}
            custom={1}
            className="inline-block bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent"
          >
            AI voice
          </motion.span>{' '}
          <motion.span
            variants={fadeUp}
            custom={2}
            className="inline-block bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent"
          >
            interviews
          </motion.span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mx-auto mb-14 max-w-2xl text-lg text-white/40 leading-relaxed"
        >
          Automated voice-based interviews with real-time AI evaluation.
          Screen candidates at scale, reduce bias, and make data-driven
          hiring decisions.
        </motion.p>

        {/* CTA Card */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
          className="mx-auto max-w-md"
        >
          <div className="relative group rounded-2xl p-[1px] bg-gradient-to-b from-violet-500/30 via-white/[0.06] to-transparent">
            {/* Glow effect behind card */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-violet-600/20 to-transparent opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-700" />

            <div className="relative rounded-2xl bg-[#0e0e18]/80 backdrop-blur-xl p-8 text-center overflow-hidden">
              {/* Top accent line */}
              <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

              {/* Icon */}
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/10">
                <Mic className="h-6 w-6 text-violet-400" />
              </div>

              {/* Text */}
              <p className="text-base font-semibold text-white mb-1">
                Received an invitation?
              </p>
              <p className="text-sm text-white/40 mb-6">
                Check your email for the interview link
              </p>

              {/* Checkmarks row */}
              <div className="flex items-center justify-center gap-5 text-xs text-white/35">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400/70" />
                  <span>Camera &amp; mic ready</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400/70" />
                  <span>15-30 min</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400/70" />
                  <span>No account needed</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ====== FEATURES SECTION ====== */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <p className="text-xs font-medium text-violet-400 uppercase tracking-[0.2em] mb-3">Features</p>
          <h2 className="mb-4 text-3xl font-bold text-white tracking-tight sm:text-4xl">
            Enterprise-grade interview automation
          </h2>
          <p className="text-white/40 max-w-xl mx-auto">
            Everything you need to run AI-powered interviews at scale
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 justify-items-center [&>*]:w-full max-w-5xl mx-auto"
        >
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              variants={fadeUp}
              custom={i}
              className="group relative rounded-2xl p-[1px] transition-all duration-500"
            >
              {/* Hover glow border */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.08] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-b from-violet-600/20 to-transparent opacity-0 group-hover:opacity-60 blur-lg transition-opacity duration-700" />

              <div className="relative rounded-2xl bg-[#0e0e18]/60 backdrop-blur-sm p-6 h-full border border-white/[0.04] group-hover:border-white/[0.08] transition-colors duration-500">
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} bg-opacity-[0.12] shadow-lg`}
                  style={{ background: `linear-gradient(135deg, rgba(124,58,237,0.12), rgba(99,102,241,0.08))` }}
                >
                  <feature.icon className="h-5 w-5 text-violet-400 group-hover:text-violet-300 transition-colors" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-white group-hover:text-violet-100 transition-colors">{feature.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed group-hover:text-white/50 transition-colors">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="relative z-10 border-t border-white/[0.04] py-10">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
              <span className="text-[10px] font-bold text-white">AI</span>
            </div>
            <span className="text-sm font-medium text-white/40">Interview</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
