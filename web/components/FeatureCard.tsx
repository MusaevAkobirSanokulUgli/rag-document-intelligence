import { ReactNode } from 'react'

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  badge: string
  color: 'indigo' | 'purple' | 'emerald' | 'cyan'
}

const COLOR_MAP = {
  indigo: {
    icon: 'bg-indigo-500/15 border-indigo-500/25 text-indigo-400',
    badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    hover: 'hover:border-indigo-500/40',
  },
  purple: {
    icon: 'bg-purple-500/15 border-purple-500/25 text-purple-400',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    hover: 'hover:border-purple-500/40',
  },
  emerald: {
    icon: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    hover: 'hover:border-emerald-500/40',
  },
  cyan: {
    icon: 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    hover: 'hover:border-cyan-500/40',
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
      className={`glass rounded-xl p-5 border border-slate-700/30
                  transition-all duration-200 cursor-default group
                  ${colors.hover} hover:-translate-y-1 hover:shadow-lg`}
    >
      {/* Icon + Badge row */}
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-10 h-10 rounded-lg border flex items-center justify-center
                      ${colors.icon} group-hover:scale-110 transition-transform duration-200`}
        >
          {icon}
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colors.badge}`}
        >
          {badge}
        </span>
      </div>

      {/* Content */}
      <h3 className="font-semibold text-slate-200 mb-2 text-sm leading-tight">{title}</h3>
      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
    </div>
  )
}
