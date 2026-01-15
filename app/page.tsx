
import Link from "next/link";
import { ArrowRight, Upload, Cpu, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
      </div>

      <div className="max-w-4xl w-full text-center space-y-8 glass-panel p-12 animate-fade-in relative z-10">
        <div className="inline-block px-4 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-blue-300 mb-4">
          Next Gen Chess Analysis
        </div>

        <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-4">
          <span className="gradient-text">Master Your Game</span>
        </h1>

        <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Upload any board position and get instant, human-like analysis powered by advanced AI.
          Undetectable, precise, and built for modern players.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
          <Link href="/analysis" className="glass-button bg-primary/20 hover:bg-primary/40 border-primary/50 text-lg group flex items-center gap-2">
            Start Analysis <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <button className="glass-button bg-white/5 hover:bg-white/10 border-white/10 text-slate-300">
            Learn More
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 text-left">
          <FeatureCard
            icon={<Upload className="w-8 h-8 text-blue-400" />}
            title="Instant Recognition"
            description="Upload screen captures or photos. Our AI reconstructs the board in seconds."
          />
          <FeatureCard
            icon={<Cpu className="w-8 h-8 text-purple-400" />}
            title="Human-like Engine"
            description="Tuned to play like a grandmaster, not a machine. Natural and undetectable."
          />
          <FeatureCard
            icon={<ShieldCheck className="w-8 h-8 text-emerald-400" />}
            title="Privacy First"
            description="All analysis runs locally in your browser. zero server-side tracking."
          />
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-slate-400 leading-snug">{description}</p>
    </div>
  );
}
