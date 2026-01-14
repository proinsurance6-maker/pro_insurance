'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type AgentAction = 'login' | 'signup' | 'forgotPin';
type ForgotPinStep = 'phone' | 'otp' | 'success';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  
  const [agentAction, setAgentAction] = useState<AgentAction>('login');
  
  // Agent login (PIN-based)
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  
  // Agent signup (Name, Email, PIN)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [signupPin, setSignupPin] = useState('');
  
  // Forgot PIN
  const [forgotPinStep, setForgotPinStep] = useState<ForgotPinStep>('phone');
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  
  // Common
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
      const errorMsg = err.response?.data?.error?.message || 
                       err.response?.data?.message || 
                       'Signup failed. Please try again.';
      setError(errorMsg);
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
      const errorMsg = err.response?.data?.error?.message || 
                       err.response?.data?.message || 
                       'Login failed. Invalid phone or PIN.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Forgot PIN - Send OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await authAPI.forgotPinSendOTP(phone.replace(/\D/g, ''));
      setSuccess(response.data.message || 'OTP sent successfully!');
      setForgotPinStep('otp');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 
                       err.response?.data?.message || 
                       'Failed to send OTP. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Forgot PIN - Reset PIN with OTP
  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPin !== confirmPin) {
      setError('PINs do not match. Please try again.');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.forgotPinResetPin({
        phone: phone.replace(/\D/g, ''),
        otp,
        newPin
      });
      setSuccess(response.data.message || 'PIN reset successfully!');
      setForgotPinStep('success');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 
                       err.response?.data?.message || 
                       'Failed to reset PIN. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Reset forgot PIN flow
  const resetForgotPinFlow = () => {
    setForgotPinStep('phone');
    setOtp('');
    setNewPin('');
    setConfirmPin('');
    setError('');
    setSuccess('');
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
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* Forgot PIN Flow */}
          {agentAction === 'forgotPin' && (
            <div>
              {/* Back Button */}
              <button
                onClick={() => { setAgentAction('login'); resetForgotPinFlow(); }}
                className="text-sm text-blue-600 hover:underline mb-4 flex items-center"
              >
                ← Back to Login
              </button>

              <h3 className="text-lg font-semibold text-gray-800 mb-4">Reset Your PIN</h3>

              {/* Step 1: Enter Phone */}
              {forgotPinStep === 'phone' && (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Enter your registered mobile number to receive an OTP.
                  </p>
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

                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={loading || phone.length !== 10}
                  >
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </Button>
                </form>
              )}

              {/* Step 2: Enter OTP & New PIN */}
              {forgotPinStep === 'otp' && (
                <form onSubmit={handleResetPin} className="space-y-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Enter the OTP sent to +91 {phone.slice(0, 3)}****{phone.slice(-3)}
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Enter OTP
                    </label>
                    <Input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit OTP"
                      className="text-center text-xl tracking-widest"
                      required
                      maxLength={6}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New 6-Digit PIN
                    </label>
                    <Input
                      type="password"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Create new PIN"
                      className="text-center text-xl tracking-widest"
                      required
                      maxLength={6}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New PIN
                    </label>
                    <Input
                      type="password"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Confirm new PIN"
                      className="text-center text-xl tracking-widest"
                      required
                      maxLength={6}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={loading || otp.length !== 6 || newPin.length !== 6 || confirmPin.length !== 6}
                  >
                    {loading ? 'Resetting PIN...' : 'Reset PIN'}
                  </Button>

                  <button
                    type="button"
                    onClick={handleSendOTP}
                    className="w-full text-sm text-blue-600 hover:underline mt-2"
                    disabled={loading}
                  >
                    Didn't receive OTP? Resend
                  </button>
                </form>
              )}

              {/* Step 3: Success */}
              {forgotPinStep === 'success' && (
                <div className="text-center py-6">
                  <div className="text-5xl mb-4">✅</div>
                  <h4 className="text-lg font-semibold text-green-700 mb-2">PIN Reset Successful!</h4>
                  <p className="text-sm text-gray-600 mb-6">
                    Your PIN has been reset. You can now login with your new PIN.
                  </p>
                  <Button 
                    onClick={() => { setAgentAction('login'); resetForgotPinFlow(); }}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Go to Login
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Login/Signup Tabs */}
          {agentAction !== 'forgotPin' && (
            <>
          <div className="flex gap-2 mb-4 border-b">
            <button
              onClick={() => { setAgentAction('login'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition ${
                agentAction === 'login'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => { setAgentAction('signup'); setError(''); setSuccess(''); }}
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

                  {/* Forgot PIN Link */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => { setAgentAction('forgotPin'); setError(''); setSuccess(''); }}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Forgot PIN?
                    </button>
                  </div>
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
        </CardContent>
      </Card>
    </div>
  );
}
