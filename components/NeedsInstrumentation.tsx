export default function NeedsInstrumentation({ metric, description }: { metric: string; description: string }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <p className="text-xs font-semibold text-amber-800 mb-1">⚠ Needs instrumentation — {metric}</p>
      <p className="text-xs text-amber-700">{description}</p>
    </div>
  )
}
