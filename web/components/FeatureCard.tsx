import { ReactNode } from 'react'

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  badge: string
  color: 'cyan' | 'sky' | 'teal' | 'blue'
}

const COLOR_MAP = {
  cyan: {
    icon: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    badge: 'bg-cyan-500/8 text-cyan-400 border-cyan-500/20',
    border: 'hover:border-cyan-500/30',
    glow: 'hover:shadow-[0_0_20px_rgba(6,182,212,0.08)]',
  },
  sky: {
    icon: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
    badge: 'bg-sky-500/8 text-sky-400 border-sky-500/20',
    border: 'hover:border-sky-500/30',
    glow: 'hover:shadow-[0_0_20px_rgba(14,165,233,0.08)]',
  },
  teal: {
    icon: 'bg-teal-500/10 border-teal-500/20 text-teal-400',
    badge: 'bg-teal-500/8 text-teal-400 border-teal-500/20',
    border: 'hover:border-teal-500/30',
    glow: 'hover:shadow-[0_0_20px_rgba(20,184,166,0.08)]',
  },
  blue: {
    icon: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    badge: 'bg-blue-500/8 text-blue-400 border-blue-500/20',
    border: 'hover:border-blue-500/30',
    glow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.08)]',
  },
}

export default function FeatureCard({
  icon,
  title,
  description,
  badge,
  color,
}: FeatureCardProps) {
  const colors = COLOR_MAP[color]

  return (
    <div
      className={`glass-card rounded-xl p-5 border border-slate-800/60
                  transition-all duration-200 cursor-default group
                  ${colors.border} ${colors.glow} hover:-translate-y-0.5`}
    >
      {/* Icon + Badge row */}
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-9 h-9 rounded-lg border flex items-center justify-center
                      ${colors.icon} group-hover:scale-105 transition-transform duration-200`}
        >
          {icon}
        </div>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase
                      tracking-wider ${colors.badge}`}
        >
          {badge}
        </span>
      </div>

      {/* Content */}
      <h3 className="font-semibold text-slate-200 mb-2 text-sm leading-tight">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
    </div>
  )
}
