import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing token.');
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await api.get(`/auth/verify-email?token=${token}`);
        setStatus('success');
        setMessage(response.data.message || 'Email verified successfully!');
        toast.success(response.data.message || 'Email verified successfully!');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (error: any) {
        setStatus('error');
        const errorMsg = error.response?.data?.message || 'Verification failed. Token may be invalid or expired.';
        setMessage(errorMsg);
        toast.error(errorMsg);
      }
    };

    verifyToken();
  }, [token, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0d1117]">
      <div className="bg-[#161b22] border border-[#30363d] p-8 rounded-xl shadow-xl w-full max-w-md text-center">
        {status === 'loading' && (
          <div>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-white">{message}</h2>
          </div>
        )}
        {status === 'success' && (
          <div>
            <div className="text-green-500 text-5xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-white mb-2">{message}</h2>
            <p className="text-slate-400 text-sm">Redirecting to login...</p>
          </div>
        )}
        {status === 'error' && (
          <div>
            <div className="text-red-500 text-5xl mb-4">❌</div>
            <h2 className="text-xl font-semibold text-white mb-2">{message}</h2>
            <button 
              onClick={() => navigate('/login')}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
