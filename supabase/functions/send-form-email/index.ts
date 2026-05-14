// Edge Function: Form gönderimlerinde admin'e mail gönderir
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'koramazomerfaruk@gmail.com'

interface FormData {
  formType: string
  data: Record<string, any>
  submittedAt: string
}

function escapeHtml(value: unknown): string {
  return String(value ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderFields(data: Record<string, any>): string {
  return Object.keys(data).map(key =>
    `<p><strong>${escapeHtml(key)}:</strong> ${escapeHtml(data[key] ?? '-')}</p>`
  ).join('')
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // OPTIONS request için
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY tanımlı değil')
    }

    const { formType, data, submittedAt }: FormData = await req.json()
    const safeData = data && typeof data === 'object' ? data : {}

    // Form tipine göre email içeriği oluştur
    let emailSubject = ''
    let emailBody = ''

    switch (formType) {
      case 'contactForm':
        emailSubject = '🔔 Yeni İletişim Formu'
        emailBody = `
          <h2>Yeni İletişim Formu Gönderildi</h2>
          ${renderFields(safeData)}
          <hr>
          <p><small>Gönderim Zamanı: ${escapeHtml(submittedAt)}</small></p>
        `
        break

      case 'customRouteForm':
        emailSubject = '🗺️ Yeni Özel Rota Talebi'
        emailBody = `
          <h2>Yeni Özel Rota Talebi</h2>
          ${renderFields(safeData)}
          <hr>
          <p><small>Gönderim Zamanı: ${escapeHtml(submittedAt)}</small></p>
        `
        break

      case 'toursForm':
        emailSubject = '🎫 Yeni Tur Rezervasyon Talebi'
        emailBody = `
          <h2>Yeni Tur Rezervasyon Talebi</h2>
          ${renderFields(safeData)}
          <hr>
          <p><small>Gönderim Zamanı: ${escapeHtml(submittedAt)}</small></p>
        `
        break

      default:
        emailSubject = '📝 Yeni Form Gönderimi'
        emailBody = `
          <h2>Yeni Form Gönderimi</h2>
          <p><strong>Form Tipi:</strong> ${escapeHtml(formType)}</p>
          <pre>${escapeHtml(JSON.stringify(safeData, null, 2))}</pre>
          <hr>
          <p><small>Gönderim Zamanı: ${escapeHtml(submittedAt)}</small></p>
        `
    }

    // Resend API ile mail gönder
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Orion Turizm <onboarding@resend.dev>',
        to: [ADMIN_EMAIL],
        subject: emailSubject,
        html: emailBody,
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      throw new Error(`Resend API hatası: ${error}`)
    }

    const result = await res.json()

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Mail gönderim hatası:', error)
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
