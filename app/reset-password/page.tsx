'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [checked, setChecked] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Имэйлийн линкээр орж ирэхэд Supabase түр session үүсгэнэ
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })

    const t = setTimeout(() => setChecked(true), 2000)
    return () => {
      subscription.unsubscribe()
      clearTimeout(t)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (password.length < 8) return setErrorMsg('Нууц үг дор хаяж 8 тэмдэгт байна.')
    if (password !== confirm) return setErrorMsg('Нууц үг таарахгүй байна.')

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) return setErrorMsg(error.message)
    setDone(true)
    setTimeout(() => {
      router.push('/')
      router.refresh()
    }, 1800)
  }

  const inputClass =
    'w-full border border-slate-300 rounded-2xl px-4 py-3.5 text-sm text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 md:p-10 border border-white/20 relative z-10 space-y-6">
        <div className="text-center space-y-1">
          <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-xl shadow-lg shadow-indigo-600/30">
            🔒
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Шинэ нууц үг</h2>
          <p className="text-xs text-slate-500">TenderAI Enterprise Workspace</p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl text-xs font-semibold border border-rose-100 flex items-center gap-2">
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        {done ? (
          <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-semibold border border-emerald-100 flex items-center gap-2">
            <span>✅</span> Нууц үг амжилттай солигдлоо. Нүүр хуудас руу шилжиж байна...
          </div>
        ) : ready ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Шинэ нууц үг</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={inputClass + ' pr-12'}
                  placeholder="Дор хаяж 8 тэмдэгт"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-indigo-600"
                >
                  {showPassword ? 'Нуух' : 'Харах'}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Нууц үгээ давтах</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className={inputClass}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl py-4 font-bold text-sm hover:from-indigo-700 hover:to-violet-700 transition shadow-lg shadow-indigo-600/30 active:scale-[0.99] disabled:opacity-50 mt-2"
            >
              {loading ? 'Хадгалж байна...' : 'Нууц үг солих'}
            </button>
          </form>
        ) : checked ? (
          <div className="space-y-3">
            <div className="p-4 bg-amber-50 text-amber-800 rounded-2xl text-xs font-semibold border border-amber-100 flex items-center gap-2">
              <span>⏳</span> Сэргээх линк хүчингүй эсвэл хугацаа нь дууссан байна.
            </div>
            <Link
              href="/forgot-password"
              className="block text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Шинэ линк авах →
            </Link>
          </div>
        ) : (
          <p className="text-center text-xs text-slate-500">Шалгаж байна...</p>
        )}

        {!done && (
          <Link
            href="/login"
            className="block text-center text-xs font-semibold text-slate-500 hover:text-indigo-600"
          >
            ← Нэвтрэх хуудас руу буцах
          </Link>
        )}
      </div>
    </div>
  )
}