
export async function sendEmail(to, subject, body){
  try{
    // Stub: replace with real integration (EmailJS/SendGrid) via fetch
    console.log('[sendEmail]', {to,subject,body})
    return { ok:true }
  }catch(e){
    console.warn('sendEmail error', e)
    return { ok:false, error:String(e) }
  }
}
