import { useState } from 'react'
import QRCode from 'qrcode'

export function buildPhoneHandoffUrl(topicId: string, currentUrl: string): string {
  const url = new URL(currentUrl)
  url.hash = ''
  url.search = ''
  url.searchParams.set('topic', topicId)
  url.searchParams.set('stage', 'test')
  url.searchParams.set('handoff', 'phone')
  return url.toString()
}

export function PhoneHandoff({ topicId }: { topicId: string }) {
  const [open, setOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const handoffUrl = buildPhoneHandoffUrl(topicId, window.location.href)
  const localAddress = ['localhost', '127.0.0.1', '::1'].includes(new URL(handoffUrl).hostname)

  async function showQr() {
    if (open) { setOpen(false); return }
    setError(''); setCopied(false); setOpen(true)
    try {
      setQrDataUrl(await QRCode.toDataURL(handoffUrl, {
        width: 280,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#17324d', light: '#ffffff' },
      }))
    } catch {
      setError('The QR code could not be generated. Copy the secure link instead.')
    }
  }

  async function copyLink() {
    setError('')
    try {
      await navigator.clipboard.writeText(handoffUrl)
      setCopied(true)
    } catch {
      setError('Copy was blocked. Select the link below and copy it manually.')
    }
  }

  return <div className="phone-handoff">
    <button className="secondary" onClick={() => void showQr()} type="button">{open ? 'Hide phone QR' : 'Continue on phone'}</button>
    {open ? <section className="phone-handoff-panel" aria-labelledby="phone-handoff-heading">
      <h2 id="phone-handoff-heading">Continue this question on your phone</h2>
      <p>Scan with the phone camera, sign in normally, and this exact question will open at the answer stage.</p>
      {qrDataUrl ? <img alt="QR code linking to this revision question" height="280" src={qrDataUrl} width="280" /> : null}
      {localAddress ? <p className="fallback-notice"><strong>Local address:</strong> a phone cannot open your computer’s localhost address. Use the deployed app, or open the development server through a phone-accessible network address before generating the QR code.</p> : null}
      <p className="security-note">The QR contains only this page link. It does not contain the password, login session or an API key.</p>
      <button className="secondary" onClick={() => void copyLink()} type="button">{copied ? 'Link copied' : 'Copy phone link'}</button>
      <label className="phone-link-label">Phone link<input onFocus={(event) => event.currentTarget.select()} readOnly value={handoffUrl} /></label>
      {error ? <p className="error" role="alert">{error}</p> : null}
    </section> : null}
  </div>
}
