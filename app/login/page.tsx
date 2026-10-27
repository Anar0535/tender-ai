'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const router = useRouter()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      })
      if (error) {
        setErrorMsg(error.message)
      } else {
        setSuccessMsg('Бүртгэл амжилттай боллоо! Та имэйлээ шалгаж баталгаажуулна уу.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setErrorMsg('Имэйл эсвэл нууц үг буруу байна.')
      } else {
        router.push('/')
        router.refresh()
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 md:p-10 border border-white/20 relative z-10 space-y-6">

        {/* Toggle Tabs (Нэвтрэх / Бүртгүүлэх) */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${!isSignUp ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Нэвтрэх
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${isSignUp ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Бүртгүүлэх
          </button>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {isSignUp ? 'Шинэ компани бүртгэх' : 'Системд нэвтрэх'}
          </h2>
          <p className="text-xs text-slate-500">TenderAI Enterprise Workspace</p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl text-xs font-semibold border border-rose-100 flex items-center gap-2">
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-semibold border border-emerald-100 flex items-center gap-2">
            <span>✅</span> {successMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Компанийн нэр / Хүний нэр</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={isSignUp}
                className="w-full border border-slate-300 rounded-2xl px-4 py-3.5 text-sm text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                placeholder="Жишээ: МонТендер ХХК"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Имэйл хаяг</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-2xl px-4 py-3.5 text-sm text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
              placeholder="name@company.mn"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Нууц үг</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-2xl px-4 py-3.5 text-sm text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-indigo-600"
              >
                {showPassword ? 'Нуух' : 'Харах'}
              </button>
            </div>

            {/* Нууц үгээ мартсан бол (зөвхөн нэвтрэх горимд) */}
            {!isSignUp && (
              <div className="pt-1 text-right">
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  Нууц үгээ мартсан уу?
                </Link>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl py-4 font-bold text-sm hover:from-indigo-700 hover:to-violet-700 transition shadow-lg shadow-indigo-600/30 active:scale-[0.99] disabled:opacity-50 mt-2"
          >
            {loading ? 'Уншиж байна...' : (isSignUp ? 'Бүртгүүлэх' : 'Нэвтрэх')}
          </button>
        </form>
      </div>
    </div>
  )
}