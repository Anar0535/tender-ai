'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) setErrorMsg(error.message)
    else setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 md:p-10 border border-white/20 relative z-10 space-y-6">
        <div className="text-center space-y-1">
          <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-xl shadow-lg shadow-indigo-600/30">
            🔑
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Нууц үг сэргээх</h2>
          <p className="text-xs text-slate-500">
            Бүртгэлтэй имэйлээ оруулбал нууц үг солих линк илгээнэ
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl text-xs font-semibold border border-rose-100 flex items-center gap-2">
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        {sent ? (
          <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-semibold border border-emerald-100 flex items-start gap-2 leading-relaxed">
            <span>✅</span>
            <span>
              Хэрэв энэ имэйл бүртгэлтэй бол сэргээх линк илгээгдлээ. Inbox болон Spam хавтсаа шалгана уу.
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl py-4 font-bold text-sm hover:from-indigo-700 hover:to-violet-700 transition shadow-lg shadow-indigo-600/30 active:scale-[0.99] disabled:opacity-50 mt-2"
            >
              {loading ? 'Илгээж байна...' : 'Сэргээх линк илгээх'}
            </button>
          </form>
        )}

        <Link
          href="/login"
          className="block text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
        >
          ← Нэвтрэх хуудас руу буцах
        </Link>
      </div>
    </div>
  )
}