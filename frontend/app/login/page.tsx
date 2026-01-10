'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type LoginMode = 'agent' | 'admin';
type AgentAction = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  
  // Mode selection
  const [mode, setMode] = useState<LoginMode>('agent');
  const [agentAction, setAgentAction] = useState<AgentAction>('signup');
  
  // Agent login (PIN-based)
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  
  // Agent signup (Name, Email, PIN, Team Mode)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [signupPin, setSignupPin] = useState('');
  
  // Admin login
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  
  // Common
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Agent Signup Handler
  const handleAgentSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.agentSignup({
        name,
        phone: phone.replace(/\D/g, ''),
        email,
        pin: signupPin,
        teamMode: 'SOLO'
      });

      const { token, agent } = response.data.data;
      login(token, agent);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Agent Login Handler (with PIN)
  const handleAgentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.agentLogin({
        phone: phone.replace(/\D/g, ''),
        pin
      });

      const { token, agent } = response.data.data;
      login(token, agent);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Invalid phone or PIN.');
    } finally {
      setLoading(false);
    }
  };

  // Admin Login Handler
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.adminLogin({
        email: adminEmail,
        password: adminPassword
      });

      const { token, admin } = response.data.data;
      login(token, admin);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <div className="flex items-center justify-center mb-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <span className="text-2xl">🛡️</span>
            </div>
          </div>
          <CardTitle className="text-center">Insurance Book</CardTitle>
          <p className="text-center text-sm text-blue-100 mt-1">Agent Portal</p>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Mode Selector */}
          <div className="flex gap-2 mb-6 border-b">
            <button
              onClick={() => { setMode('agent'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition ${
                mode === 'agent'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Agent
            </button>
            <button
              onClick={() => { setMode('admin'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition ${
                mode === 'admin'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Admin
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Agent Section */}
          {mode === 'agent' && (
            <>
              {/* Login/Signup Tabs */}
              <div className="flex gap-2 mb-4 border-b">
                <button
                  onClick={() => { setAgentAction('login'); setError(''); }}
                  className={`flex-1 py-2 text-sm font-medium border-b-2 transition ${
                    agentAction === 'login'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => { setAgentAction('signup'); setError(''); }}
                  className={`flex-1 py-2 text-sm font-medium border-b-2 transition ${
                    agentAction === 'signup'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Login Form */}
              {agentAction === 'login' && (
                <form onSubmit={handleAgentLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile Number
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        +91
                      </span>
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="9876543210"
                        className="rounded-l-none"
                        required
                        maxLength={10}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      6-Digit PIN
                    </label>
                    <Input
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="text-center text-2xl tracking-widest"
                      required
                      maxLength={6}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={loading || phone.length !== 10 || pin.length !== 6}
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </Button>
                </form>
              )}

              {/* Signup Form */}
              {agentAction === 'signup' && (
                <form onSubmit={handleAgentSignup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Name
                    </label>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile Number
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        +91
                      </span>
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="9876543210"
                        className="rounded-l-none"
                        required
                        maxLength={10}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Create 6-Digit PIN
                    </label>
                    <Input
                      type="password"
                      value={signupPin}
                      onChange={(e) => setSignupPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="text-center text-2xl tracking-widest"
                      required
                      maxLength={6}
                    />
                    <p className="text-xs text-gray-500 mt-1">Use this PIN to login next time</p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={loading || phone.length !== 10 || !name || !email || signupPin.length !== 6}
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Button>

                  <p className="text-xs text-center text-gray-500 mt-3">
                    ✓ 60 days free trial • ₹100/month after
                  </p>
                </form>
              )}
            </>
          )}

          {/* Admin Section */}
          {mode === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@insurancebook.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <Input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
