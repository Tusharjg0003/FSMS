'use client';

import { useState, useEffect } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function SignInPage() {
  // Splash screen state
  const [showLetters, setShowLetters] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  
  // Sign in state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get('message');

  // Splash screen animation
  useEffect(() => {
    // Start letter animation immediately
    const letterTimer = setTimeout(() => {
      setShowLetters(true);
    }, 100);

    // Show login after letters finish animating
    const loginTimer = setTimeout(() => {
      setShowLogin(true);
    }, 2500);

    return () => {
      clearTimeout(letterTimer);
      clearTimeout(loginTimer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        // Check if user is authenticated
        const session = await getSession();
        if (session) {
          if (session.user.role === 'TECHNICIAN') {
            router.push('/technician');
          } else {
            router.push('/dashboard');
          }
        }
      }
    } catch (err) {
      setError('An error occurred during sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="splash-container">
        {/* FSMS Letters - stays in background */}
        <div className={`background-letters ${showLetters ? 'animate' : ''} ${showLogin ? 'fade-to-background' : ''}`}>
          <div className="letter letter-f">F</div>
          <div className="letter letter-s">S</div>
          <div className="letter letter-m">M</div>
          <div className="letter letter-s2">S</div>
        </div>

        {/* Login form that appears on top */}
        <div className={`login-overlay ${showLogin ? 'show' : ''}`}>
          <div className="login-container">
            <div className="login-card">
              <h2 className="login-title">Sign in to your account</h2>
              <p className="login-subtitle">
                Or{' '}
                <Link href="/auth/register" className="register-link">
                  create a new account
                </Link>
              </p>
              
              {message && (
                <div className="success-message">
                  {message}
                </div>
              )}

              <form className="login-form" onSubmit={handleSubmit}>
                {error && (
                  <div className="error-message">
                    {error}
                  </div>
                )}
                
                <div className="form-fields">
                  <div className="form-group">
                    <label htmlFor="email" className="form-label">
                      Email address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="form-input"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="password" className="form-label">
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      className="form-input"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="submit-button"
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .splash-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: linear-gradient(135deg, #add6ff 0%, #E8F4FD 100%);
          overflow: hidden;
        }

        /* FSMS Letters in background */
        .background-letters {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          gap: 5rem;
          z-index: 1;
          transition: all 1s ease-out;
        }

        .background-letters.fade-to-background {
          transform: translate(-50%, -50%) rotate(-15deg) scale(2.5);
          opacity: 0.08;
          filter: blur(2px);
        }

        .letter {
          font-size: 14rem;
          font-weight: bold;
          opacity: 0;
          transform: translateY(100px) rotateX(90deg);
          transition: all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .background-letters.animate .letter {
          opacity: 1;
          transform: translateY(0) rotateX(0);
        }

        .letter-f {
          color: #3e86b5;
          transition-delay: 0.1s;
        }

        .letter-s {
          color: #7fc1f0;
          transition-delay: 0.3s;
        }

        .letter-m {
          color: #3a8ed7;
          transition-delay: 0.5s;
        }

        .letter-s2 {
          color: #7fc1f0;
          transition-delay: 0.7s;
        }

        /* Login overlay */
        .login-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          opacity: 0;
          pointer-events: none;
          transition: opacity 1s ease-in-out;
          z-index: 10;
        }

        .login-overlay.show {
          opacity: 1;
          pointer-events: all;
        }

        .login-container {
          padding: 1rem;
          max-width: 500px;
          width: 100%;
        }

        .login-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          padding: 3rem;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          width: 100%;
          transform: translateY(50px);
          animation: slideUp 0.8s ease-out forwards;
          position: relative;
          z-index: 2;
        }

        @keyframes slideUp {
          to {
            transform: translateY(0);
          }
        }

        .login-title {
          text-align: center;
          font-size: 1.875rem;
          font-weight: 800;
          color: #111827;
          
          margin-bottom: 0.5rem;
        }

        .login-subtitle {
          text-align: center;
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 2rem;
        }

        .register-link {
          font-weight: 500;
          color: #2563eb;
          text-decoration: none;
        }

        .register-link:hover {
          color: #1d4ed8;
        }

        .success-message {
          background-color: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #15803d;
          padding: 0.75rem 1rem;
          border-radius: 0.375rem;
          margin-bottom: 1.5rem;
        }

        .error-message {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 0.75rem 1rem;
          border-radius: 0.375rem;
          margin-bottom: 1.5rem;
        }

        .login-form {
          margin-top: 2rem;
        }

        .form-fields {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .form-input {
          margin-top: 0.25rem;
          display: block;
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #8f9093ff;
          border-radius: 0.375rem;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          font-size: 0.875rem;
          line-height: 1.25rem;
          box-sizing: border-box;
          color: #4e4e50ff;
        }

        .form-input:focus {
          outline: 2px solid transparent;
          outline-offset: 2px;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .submit-button {
          width: 100%;
          padding: 12px 24px;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          background: linear-gradient(135deg, #6f9de7, #4f9cc5);
          color: white;
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(111, 157, 231, 0.4);
        }

        .submit-button:focus {
          outline: 2px solid transparent;
          outline-offset: 2px;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
        }

        .submit-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .letter {
            font-size: 5rem;
          }
          
          .background-letters {
            gap: 2rem;
          }
          
          .login-card {
            padding: 2rem;
          }

          .login-container {
            padding: 1rem;
          }
        }
      `}</style>
    </>
  );
}