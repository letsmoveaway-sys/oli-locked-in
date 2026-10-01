export const PRODUCT_TIME_ZONE = 'Europe/London'

function partsFor(date: Date): Record<string, string> {
  return Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: PRODUCT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).map((part) => [part.type, part.value]))
}

export function productDateKey(date = new Date()): string {
  const parts = partsFor(date)
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function formatProductTime(value: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: PRODUCT_TIME_ZONE,
  }).format(typeof value === 'string' ? new Date(value) : value)
}

export function formatProductDate(value: string | Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: PRODUCT_TIME_ZONE })
    .format(typeof value === 'string' ? new Date(value) : value)
}

export function productIsoToLocalDateTime(value: string): string {
  const parts = partsFor(new Date(value))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

/** Convert a datetime-local wall time in the product timezone to an ISO instant. */
export function productLocalDateTimeToIso(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) throw new Error('Choose a valid date and time.')
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

  const resolved = partsFor(new Date(candidate))
  if (`${resolved.year}-${resolved.month}-${resolved.day}T${resolved.hour}:${resolved.minute}` !== value) {
    throw new Error('That local time does not exist because the UK clocks change then. Choose another time.')
  }
  return new Date(candidate).toISOString()
}
