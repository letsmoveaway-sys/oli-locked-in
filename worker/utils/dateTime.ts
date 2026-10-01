export const PRODUCT_TIME_ZONE = 'Europe/London'

function partsFor(date: Date): Record<string, string> {
  return Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: PRODUCT_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map((part) => [part.type, part.value]))
}

export function productDateKey(date = new Date()): string {
  const parts = partsFor(date)
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function productLocalDateTimeToIso(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) throw new Error('Invalid product-local datetime')
  const [, year, month, day, hour, minute] = match
  const desired = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))
  let candidate = desired
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = partsFor(new Date(candidate))
    const rendered = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute))
    const adjustment = desired - rendered
    candidate += adjustment
    if (adjustment === 0) break
  }
  return new Date(candidate).toISOString()
}
