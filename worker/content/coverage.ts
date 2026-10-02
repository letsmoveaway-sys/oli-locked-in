export interface CoverageItem {
  id: string
  name: string
}

const coverageOverrides: Record<string, string[]> = {
  'maths-number-standard-surds': [
    'Convert between ordinary numbers and standard form',
    'Compare and order numbers in standard form',
    'Calculate with numbers in standard form',
    'Solve contextual problems using standard form',
    'Simplify surds by identifying square factors',
    'Add and subtract like surds',
    'Multiply surds and simplify the result',
    'Expand brackets containing surds',
    'Rationalise a denominator containing one surd',
    'Rationalise a binomial denominator using a conjugate',
    'Use exact surd values in multi-step problems',
  ],
}

export function buildCoverageItems(topic: { id: string; name: string; description: string }): CoverageItem[] {
  const overridden = coverageOverrides[topic.id]
  const text = String(topic.description ?? '').replace(/[.;]+$/, '')
  const points = overridden ?? text
    .split(/\s*;\s*|\s*\.\s+(?=[A-Z])/)
    .flatMap((part) => part.includes(',') ? part.split(/\s*,\s*/) : [part])
    .map((part) => part.trim())
    .filter((part) => part.length >= 4)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
  const unique = [...new Set(points)]
  return (unique.length >= 2 ? unique : [topic.name]).map((name, index) => ({
    id: `${topic.id}--coverage-${index + 1}`,
    name,
  }))
}
