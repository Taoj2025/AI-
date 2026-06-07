"use client";

import { useState } from "react";
import Link from "next/link";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);

  const sendCode = () => {
    if (!phone || phone.length !== 11) return;
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(timer); return 0; } return c - 1; });
    }, 1000);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ResumeAI
          </h1>
          <p className="text-gray-500 mt-2">AI 驱动的智能简历平台</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Tab 切换 */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === "login" ? "bg-white shadow text-blue-600" : "text-gray-500"}`}
            >
              登录
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === "register" ? "bg-white shadow text-blue-600" : "text-gray-500"}`}
            >
              注册
            </button>
          </div>

          {/* 手机号 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">手机号</label>
            <input
              type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入手机号" maxLength={11}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
          </div>

          {/* 验证码 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">验证码</label>
            <div className="flex gap-3">
              <input
                type="text" value={code} onChange={(e) => setCode(e.target.value)}
                placeholder="请输入验证码" maxLength={6}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
              <button
                onClick={sendCode} disabled={countdown > 0}
                className="px-4 py-3 rounded-xl bg-blue-50 text-blue-600 text-sm font-medium hover:bg-blue-100 disabled:bg-gray-100 disabled:text-gray-400 transition-colors whitespace-nowrap"
              >
                {countdown > 0 ? `${countdown}s` : "获取验证码"}
              </button>
            </div>
          </div>

          {/* 提交按钮 */}
          <button className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity">
            {mode === "login" ? "登录" : "注册并开始使用"}
          </button>

          {/* 第三方登录 */}
          <div className="mt-6 text-center">
            <div className="text-xs text-gray-400 mb-4">或使用以下方式登录</div>
            <div className="flex justify-center gap-4">
              {[
                { icon: "💬", label: "微信", color: "hover:bg-green-50" },
                { icon: "🍎", label: "Apple", color: "hover:bg-gray-100" },
                { icon: "📧", label: "Google", color: "hover:bg-blue-50" },
              ].map((item) => (
                <button key={item.label} className={`flex flex-col items-center gap-1 p-3 rounded-xl ${item.color} transition-colors`}>
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-xs text-gray-500">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          登录即表示同意 <Link href="#" className="text-blue-500">用户协议</Link> 和 <Link href="#" className="text-blue-500">隐私政策</Link>
        </p>
      </div>
    </main>
  );
}
