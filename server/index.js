import express from 'express'
import cors from 'cors'
import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

dotenv.config()
const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 4000
const LOG_PATH = join(process.cwd(), 'server', 'logs', 'reset-log.json')

function appendResetLog(entry){
  let list = []
  try{ if(existsSync(LOG_PATH)) list = JSON.parse(readFileSync(LOG_PATH, 'utf-8')||'[]') }catch{}
  list.unshift(entry)
  writeFileSync(LOG_PATH, JSON.stringify(list,null,2))
}

function makeTransporter(){
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = Number(process.env.SMTP_PORT || 465)
  const secure = String(process.env.SMTP_SECURE || 'true') === 'true'
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } })
}

function genTempPassword(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
  let out=''
  for(let i=0;i<10;i++){ out += chars[Math.floor(Math.random()*chars.length)] }
  return out
}

app.post('/api/reset-password', async (req,res)=>{
  const { email } = req.body || {}
  const temp = genTempPassword()
  let status='ok', error=null
  try{
    const t = makeTransporter()
    await t.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: 'Password reset',
      html: `<p>Your temporary password: <b>${temp}</b></p>`
    })
  }catch(e){
    status='error'; error=String(e)
  }
  appendResetLog({ at:new Date().toISOString(), email, status, error })
  res.json({ ok:true, tempPassword: temp, emailed: status==='ok' })
})

app.listen(PORT, ()=> console.log('[server] running on '+PORT))