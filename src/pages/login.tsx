import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { adminApi, apiMessage } from '../lib/api'
import { clearSession, saveSession } from '../lib/auth'

const keySchema = z.object({ apiKey: z.string().min(1, 'Vui lòng nhập API key') })
const credentialsSchema = z.object({ email: z.string().email('Vui lòng nhập email hợp lệ'), password: z.string().min(1, 'Vui lòng nhập mật khẩu') })
type KeyInput = z.infer<typeof keySchema>
type Credentials = z.infer<typeof credentialsSchema>

export function LoginPage() {
  const [method, setMethod] = useState<'key' | 'password'>('key')
  const [busy, setBusy] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const nav = useNavigate()
  const keyForm = useForm<KeyInput>({ resolver: zodResolver(keySchema), defaultValues: { apiKey: '' } })
  const passwordForm = useForm<Credentials>({ resolver: zodResolver(credentialsSchema), defaultValues: { email: '', password: '' } })
  const complete = (session: { apiKey?: string; accessToken?: string; method: 'api-key' | 'password'; username?: string; role?: string }) => {
    saveSession(session, rememberMe)
    toast.success('Đăng nhập thành công')
    nav('/admin', { replace: true })
  }
  const loginWithKey = async ({ apiKey }: KeyInput) => {
    setBusy(true)
    saveSession({ apiKey, method: 'api-key' }, rememberMe)
    try { await adminApi.validateKey(); complete({ apiKey, method: 'api-key' }) }
    catch (error) { clearSession(); toast.error(apiMessage(error)) }
    finally { setBusy(false) }
  }
  const loginWithPassword = async ({ email, password }: Credentials) => {
    setBusy(true)
    try {
      const response = await adminApi.login(email, password)
      const payload = response.data?.data || response.data
      const accessToken = payload?.accessToken || payload?.token || payload?.jwt
      if (!accessToken) throw new Error('Máy chủ không trả về JWT access token.')
      saveSession({ accessToken, method: 'password', username: email }, rememberMe)
      const meResponse = await adminApi.me()
      const profile = meResponse.data?.data || meResponse.data || {}
      complete({ accessToken, method: 'password', username: profile.email || profile.username || email, role: profile.role })
    } catch (error: any) {
      clearSession()
      toast.error(error?.message === 'Máy chủ không trả về JWT access token.' ? error.message : apiMessage(error))
    } finally { setBusy(false) }
  }
  const rememberControl = <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-600"><input checked={rememberMe} onChange={e=>setRememberMe(e.target.checked)} type="checkbox" className="h-4 w-4 rounded border-zinc-300 accent-red-600"/>Ghi nhớ đăng nhập trên thiết bị này</label>
  return <main className="min-h-screen bg-zinc-950 px-5 py-8 sm:grid sm:place-items-center"><div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/45 via-zinc-950 to-zinc-950"/><section className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl shadow-black/40 md:grid-cols-[.9fr_1.1fr]"><div className="hidden min-h-[590px] flex-col justify-between bg-red-700 p-10 text-white md:flex"><div><div className="grid h-11 w-11 place-items-center rounded-xl bg-white font-display text-xl text-red-700">F</div><p className="mt-10 text-xs font-bold tracking-[.22em] text-red-100">FOTOBOOTH.VN</p><h1 className="mt-3 font-display text-4xl leading-tight">Không gian quản trị cho những khoảnh khắc đáng nhớ.</h1><p className="mt-5 max-w-sm text-sm leading-6 text-red-100">Theo dõi từng yêu cầu booking, dịch vụ và giá tại một nơi bảo mật.</p></div><div className="flex items-center gap-3 text-sm text-red-100"><ShieldCheck size={20}/><span>Xác thực bằng JWT hoặc API key</span></div></div><div className="p-7 sm:p-10"><div className="mb-8"><p className="text-xs font-bold tracking-[.18em] text-red-600">ADMIN PORTAL</p><h2 className="mt-2 text-2xl font-bold text-zinc-900">Đăng nhập</h2><p className="mt-2 text-sm text-zinc-500">Xác thực để truy cập trang quản trị.</p></div><div className="mb-7 grid grid-cols-2 rounded-xl bg-zinc-100 p-1"><button onClick={()=>setMethod('key')} className={`rounded-lg px-3 py-2 text-sm font-bold transition ${method==='key'?'bg-white text-zinc-900 shadow-sm':'text-zinc-500'}`}>API key</button><button onClick={()=>setMethod('password')} className={`rounded-lg px-3 py-2 text-sm font-bold transition ${method==='password'?'bg-white text-zinc-900 shadow-sm':'text-zinc-500'}`}>Tài khoản</button></div>{method==='key'?<form onSubmit={keyForm.handleSubmit(loginWithKey)}><label className="label">Admin API key</label><div className="relative"><KeyRound className="absolute left-3 top-3 text-zinc-400" size={18}/><input autoFocus type="password" autoComplete="off" placeholder="Nhập API key" className="field pl-10" {...keyForm.register('apiKey')}/></div>{keyForm.formState.errors.apiKey&&<p className="mt-1 text-xs text-red-600">{keyForm.formState.errors.apiKey.message}</p>}<p className="mt-3 text-xs leading-5 text-zinc-500">API key chỉ được lưu trong phiên trình duyệt hiện tại.</p>{rememberControl}<button disabled={busy} className="btn-primary mt-7 w-full">{busy?'Đang xác thực…':'Đăng nhập bằng API key'}</button></form>:<form onSubmit={passwordForm.handleSubmit(loginWithPassword)}><label className="label">Email</label><div className="relative"><UserRound className="absolute left-3 top-3 text-zinc-400" size={18}/><input autoFocus type="email" autoComplete="username" className="field pl-10" placeholder="admin@fotobooth.vn" {...passwordForm.register('email')}/></div>{passwordForm.formState.errors.email&&<p className="mt-1 text-xs text-red-600">{passwordForm.formState.errors.email.message}</p>}<label className="label mt-5 block">Mật khẩu</label><div className="relative"><LockKeyhole className="absolute left-3 top-3 text-zinc-400" size={18}/><input type="password" autoComplete="current-password" className="field pl-10" placeholder="••••••••" {...passwordForm.register('password')}/></div>{passwordForm.formState.errors.password&&<p className="mt-1 text-xs leading-5 text-red-600">{passwordForm.formState.errors.password.message}</p>}<p className="mt-3 text-xs leading-5 text-zinc-500">Đăng nhập qua JWT; mật khẩu không được lưu tại trình duyệt.</p>{rememberControl}<button disabled={busy} className="btn-primary mt-7 w-full">{busy?'Đang xác thực…':'Đăng nhập'}</button></form>}</div></section></main>
}
