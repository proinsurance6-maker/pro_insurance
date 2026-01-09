'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type LoginMode = 'agent' | 'admin';
type OTPStep = 'phone' | 'otp' | 'register';
type AgentAction = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  
  // Mode selection
  const [mode, setMode] = useState<LoginMode>('agent');
  const [agentAction, setAgentAction] = useState<AgentAction>('login');
  
  // Agent OTP login
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState<OTPStep>('phone');
  const [isNewUser, setIsNewUser] = useState(false);
  const [name, setName] = useState('');
  const [teamMode, setTeamMode] = useState('solo');
  
  // Admin login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Common
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Send OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.sendAgentOTP(phone);
      const { isNewUser: newUser, expiresIn } = response.data.data;
      
      // If user clicked signup but phone exists, show message
      if (agentAction === 'signup' && !newUser) {
        setError('This phone number is already registered. Please login instead.');
        setAgentAction('login');
        setLoading(false);
        return;
      }
      
      // If user clicked login but phone is new, prompt signup
      if (agentAction === 'login' && newUser) {
        setIsNewUser(true);
        setOtpStep('register');
      } else if (agentAction === 'signup') {
        // Signup flow - go directly to OTP verification
        setIsNewUser(true);
        setOtpStep('otp');
      } else {
        // Login flow for existing user
        setIsNewUser(false);
        setOtpStep('otp');
      }
      
      // Start countdown
      setCountdown(expiresIn);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Pass name and teamMode for both signup flow and register step
      const shouldRegister = isNewUser || agentAction === 'signup';
      
      const response = await authAPI.verifyAgentOTP(
        phone, 
        otp, 
        shouldRegister ? name : undefined,
        shouldRegister ? teamMode.toUpperCase() : undefined
      );
      
      const { token, user } = response.data.data;
      login(token, user);
      
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // Admin Login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.adminLogin(email, password);
      const { token, user } = response.data.data;
      
      login(token, user);
      router.push('/admin');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Format countdown
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">Insurance Book</CardTitle>
          <p className="text-gray-500 mt-1">
            {mode === 'agent' 
              ? (agentAction === 'login' ? 'Agent Portal - Login with OTP' : 'Create New Agent Account')
              : 'Admin Login'}
          </p>
        </CardHeader>

        <CardContent>
          {/* Mode Tabs */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => { setMode('agent'); setError(''); setOtpStep('phone'); setAgentAction('login'); }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
                mode === 'agent' 
                  ? 'bg-white shadow text-blue-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Agent
            </button>
            <button
              onClick={() => { setMode('admin'); setError(''); }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
                mode === 'admin' 
                  ? 'bg-white shadow text-blue-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Admin
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Agent OTP Login */}
          {mode === 'agent' && (
            <>
              {/* Agent Login/Signup Tabs */}
              {otpStep === 'phone' && (
                <div className="flex mb-4 border-b">
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
                    New Agent? Sign Up
                  </button>
                </div>
              )}

              {/* Step 1: Phone Number */}
              {otpStep === 'phone' && (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  {agentAction === 'signup' && (
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
                  )}
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
                  {agentAction === 'signup' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Team Mode
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setTeamMode('solo')}
                          className={`p-3 border rounded-lg text-center transition ${
                            teamMode === 'solo'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium text-sm">Solo</div>
                          <div className="text-xs text-gray-500">Work alone</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTeamMode('team')}
                          className={`p-3 border rounded-lg text-center transition ${
                            teamMode === 'team'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium text-sm">Team</div>
                          <div className="text-xs text-gray-500">With sub-agents</div>
                        </button>
                      </div>
                    </div>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || phone.length !== 10 || (agentAction === 'signup' && !name)}
                  >
                    {loading ? 'Sending OTP...' : 'Get OTP'}
                  </Button>
                </form>
              )}

              {/* Step 2: OTP Verification (Existing User) */}
              {otpStep === 'otp' && (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="text-center mb-4">
                    {isNewUser && agentAction === 'signup' ? (
                      <>
                        <div className="text-green-600 text-2xl mb-2">✓</div>
                        <p className="text-sm text-gray-600">
                          Creating account for <span className="font-semibold">{name}</span>
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-600">
                        Welcome back!
                      </p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">
                      OTP sent to <span className="font-semibold">+91 {phone}</span>
                    </p>
                    {countdown > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Expires in {formatCountdown(countdown)}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Enter OTP
                    </label>
                    <Input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      className="text-center text-2xl tracking-widest"
                      required
                      maxLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                    {loading 
                      ? (isNewUser ? 'Creating Account...' : 'Verifying...') 
                      : (isNewUser ? 'Create Account & Login' : 'Verify & Login')
                    }
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setOtpStep('phone'); setOtp(''); }}
                    className="w-full text-sm text-gray-600 hover:text-gray-800"
                  >
                    Change Phone Number
                  </button>
                </form>
              )}

              {/* Step 3: Registration (New User) */}
              {otpStep === 'register' && (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-600">
                      Welcome! Complete your registration
                    </p>
                  </div>
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
                      Enter OTP
                    </label>
                    <Input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      className="text-center text-xl tracking-widest"
                      required
                      maxLength={6}
                    />
                    {countdown > 0 && (
                      <p className="text-xs text-gray-500 mt-1 text-center">
                        Expires in {formatCountdown(countdown)}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team Mode
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setTeamMode('solo')}
                        className={`p-3 border rounded-lg text-center transition ${
                          teamMode === 'solo' 
                            ? 'border-blue-500 bg-blue-50 text-blue-700' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">Solo</div>
                        <div className="text-xs text-gray-500">Work alone</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTeamMode('team')}
                        className={`p-3 border rounded-lg text-center transition ${
                          teamMode === 'team' 
                            ? 'border-blue-500 bg-blue-50 text-blue-700' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">Team</div>
                        <div className="text-xs text-gray-500">With sub-agents</div>
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || otp.length !== 6 || !name}>
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setOtpStep('phone'); setOtp(''); setName(''); }}
                    className="w-full text-sm text-gray-600 hover:text-gray-800"
                  >
                    Change Phone Number
                  </button>
                </form>
              )}
            </>
          )}

          {/* Admin Login */}
          {mode === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-xs text-gray-500">
              60 days free trial • ₹100/month after
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
