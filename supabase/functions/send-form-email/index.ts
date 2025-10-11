// Edge Function: Form gönderimlerinde admin'e mail gönderir
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'koramazomerfaruk@gmail.com'

interface FormData {
  formType: string
  data: Record<string, any>
  submittedAt: string
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
    const { formType, data, submittedAt }: FormData = await req.json()

    // Form tipine göre email içeriği oluştur
    let emailSubject = ''
    let emailBody = ''

    switch (formType) {
      case 'contactForm':
        emailSubject = '🔔 Yeni İletişim Formu'
        emailBody = `
          <h2>Yeni İletişim Formu Gönderildi</h2>
          ${Object.keys(data).map(key => 
            `<p><strong>${key}:</strong> ${data[key] || '-'}</p>`
          ).join('')}
          <hr>
          <p><small>Gönderim Zamanı: ${submittedAt}</small></p>
        `
        break

      case 'customRouteForm':
        emailSubject = '🗺️ Yeni Özel Rota Talebi'
        emailBody = `
          <h2>Yeni Özel Rota Talebi</h2>
          ${Object.keys(data).map(key => 
            `<p><strong>${key}:</strong> ${data[key] || '-'}</p>`
          ).join('')}
          <hr>
          <p><small>Gönderim Zamanı: ${submittedAt}</small></p>
        `
        break

      case 'toursForm':
        emailSubject = '🎫 Yeni Tur Rezervasyon Talebi'
        emailBody = `
          <h2>Yeni Tur Rezervasyon Talebi</h2>
          ${Object.keys(data).map(key => 
            `<p><strong>${key}:</strong> ${data[key] || '-'}</p>`
          ).join('')}
          <hr>
          <p><small>Gönderim Zamanı: ${submittedAt}</small></p>
        `
        break

      default:
        emailSubject = '📝 Yeni Form Gönderimi'
        emailBody = `
          <h2>Yeni Form Gönderimi</h2>
          <p><strong>Form Tipi:</strong> ${formType}</p>
          <pre>${JSON.stringify(data, null, 2)}</pre>
          <hr>
          <p><small>Gönderim Zamanı: ${submittedAt}</small></p>
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
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
