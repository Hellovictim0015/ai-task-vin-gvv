// app/login/page.jsx
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BASE_URL } from '@/lib/api'; // Sirf BASE_URL import kiya
import { Lock, Eye, EyeOff, Smartphone } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Direct API Call yahan lagaya hai
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      
      const response = await res.json();

      if (!res.ok) {
        throw new Error(response.detail || 'Login failed. Please check your credentials.');
      }
      
      const token = response.access_token;
      const role = response.user.role;

      // 1. Save Token for Client-side (Local Storage)
      localStorage.setItem('access_token', token);
      localStorage.setItem('user', JSON.stringify(response.user));

      // 2. Save Token in Cookies for Next.js Middleware (1 day expiration)
      // "secure" cookies are dropped by the browser on plain http:// (e.g. http://VPS_IP:3066),
      // so only add it when the site is actually served over HTTPS.
      const secureFlag = window.location.protocol === 'https:' ? '; secure' : '';
      document.cookie = `access_token=${token}; path=/; max-age=86400; samesite=lax${secureFlag}`;
      document.cookie = `user_role=${role}; path=/; max-age=86400; samesite=lax${secureFlag}`;

      // 3. Role-based routing (Matching your middleware structure)
      const dashboards = {
        super_admin: '/super_admin',
        admin: '/admin',
        project_head: '/project_head',
        department_head: '/department_head',
      };
      router.replace(dashboards[role] ?? '/TEAM_MEMBER');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      
      {/* Left Section - Full Screen Image (Hidden on mobile) */}
      <div className="hidden lg:block lg:w-1/2 relative min-h-screen overflow-hidden">
        <Image
          src="/ChatGPT Image May 24, 2026, 03_16_59 PM.png"
          alt="TaskFlow Dashboard Platform"
          fill
          sizes="50vw"
          className="object-cover object-left"
          priority
        />
      </div>

      {/* Right Section - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white z-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-8 h-8 bg-[#7c3aed] rounded-md flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-sm transform rotate-45"></div>
              </div>
              <span className="font-bold text-xl text-gray-900">TaskFlow <span className="text-[#7c3aed]">AI</span></span>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back! 👋</h2>
            <p className="text-gray-500">Login to your account to continue</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Phone Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Smartphone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent transition-all outline-none"
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent transition-all outline-none"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[#7c3aed] focus:ring-[#7c3aed] border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <a href="#" className="font-medium text-[#7c3aed] hover:text-[#6d28d9] transition-colors">
                  Forgot password?
                </a>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-[#7c3aed] hover:bg-[#6d28d9] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7c3aed] disabled:opacity-70 transition-colors"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}