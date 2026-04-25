const COLORS = {
  default: 'bg-gray-50 text-gray-600',
  rose: 'bg-primary-50 text-primary-600',
  green: 'bg-green-50 text-green-600',
  blue: 'bg-blue-50 text-blue-600',
  amber: 'bg-amber-50 text-amber-600',
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: React.ReactNode
  color?: keyof typeof COLORS
}

export default function StatCard({ label, value, sub, icon, color = 'default' }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{label}</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {icon && (
          <div className={`p-2 rounded-lg flex-shrink-0 ${COLORS[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
