'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const registerSchema = z.object({
 name: z.string().min(2, 'Name must be at least 2 characters'),
 email: z.string().email('Invalid email address'),
 password: z.string().min(6, 'Password must be at least 6 characters'),
 role: z.enum(['ADMIN', 'SUPERVISOR', 'TECHNICIAN']),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
 const [isLoading, setIsLoading] = useState(false);
 const [error, setError] = useState('');
 const router = useRouter();

 const {
   register,
   handleSubmit,
   formState: { errors },
 } = useForm<RegisterFormData>({
   resolver: zodResolver(registerSchema),
 });

 const onSubmit = async (data: RegisterFormData) => {
   setIsLoading(true);
   setError('');

   try {
     const response = await fetch('/api/auth/register', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify(data),
     });

     if (response.ok) {
       router.push('/auth/signin?message=Registration successful! Please sign in.');
     } else {
       const errorData = await response.json();
       setError(errorData.error || 'Registration failed');
     }
   } catch (err) {
     setError('An error occurred during registration');
   } finally {
     setIsLoading(false);
   }
 };

 return (
   <>
     <div className="register-container">
       {/* FSMS Letters in background - static, no animation */}
       <div className="background-letters">
         <div className="letter letter-f">F</div>
         <div className="letter letter-s">S</div>
         <div className="letter letter-m">M</div>
         <div className="letter letter-s2">S</div>
       </div>

       {/* Registration form */}
       <div className="register-overlay">
         <div className="register-form-container">
           <div className="register-card">
             <h2 className="register-title">Create your account</h2>
             <p className="register-subtitle">
               Or{' '}
               <Link href="/auth/signin" className="signin-link">
                 sign in to your existing account
               </Link>
             </p>

             <form className="register-form" onSubmit={handleSubmit(onSubmit)}>
               {error && (
                 <div className="error-message">
                   {error}
                 </div>
               )}
              
               <div className="form-fields">
                 <div className="form-group">
                   <label htmlFor="name" className="form-label">
                     Full Name
                   </label>
                   <input
                     {...register('name')}
                     type="text"
                     className="form-input"
                     placeholder="John Doe"
                   />
                   {errors.name && (
                     <p className="field-error">{errors.name.message}</p>
                   )}
                 </div>

                 <div className="form-group">
                   <label htmlFor="email" className="form-label">
                     Email address
                   </label>
                   <input
                     {...register('email')}
                     type="email"
                     className="form-input"
                     placeholder="john@example.com"
                   />
                   {errors.email && (
                     <p className="field-error">{errors.email.message}</p>
                   )}
                 </div>

                 <div className="form-group">
                   <label htmlFor="password" className="form-label">
                     Password
                   </label>
                   <input
                     {...register('password')}
                     type="password"
                     className="form-input"
                     placeholder="••••••••"
                   />
                   {errors.password && (
                     <p className="field-error">{errors.password.message}</p>
                   )}
                 </div>

                 <div className="form-group">
                   <label htmlFor="role" className="form-label">
                     Role
                   </label>
                   <select
                     {...register('role')}
                     className="form-input"
                   >
                     <option value="">Select a role</option>
                     <option value="ADMIN">Admin</option>
                     <option value="SUPERVISOR">Supervisor</option>
                     <option value="TECHNICIAN">Technician</option>
                   </select>
                   {errors.role && (
                     <p className="field-error">{errors.role.message}</p>
                   )}
                 </div>
               </div>

               <button
                 type="submit"
                 disabled={isLoading}
                 className="submit-button"
               >
                 {isLoading ? 'Creating account...' : 'Create account'}
               </button>
             </form>
           </div>
         </div>
       </div>
     </div>

     <style jsx>{`
       .register-container {
         position: fixed;
         top: 0;
         left: 0;
         width: 100vw;
         height: 100vh;
         background: linear-gradient(135deg, #add6ff 0%, #E8F4FD 100%);
         overflow: hidden;
       }

       /* FSMS Letters in background - static, expanded */
       .background-letters {
         position: absolute;
         top: 50%;
         left: 50%;
         transform: translate(-50%, -50%) rotate(-15deg) scale(2.5);
         display: flex;
         gap: 5rem;
         z-index: 1;
         opacity: 0.08;
         filter: blur(2px);
       }

       .letter {
         font-size: 14rem;
         font-weight: bold;
       }

       .letter-f {
         color: #3e86b5;
       }

       .letter-s {
         color: #7fc1f0;
       }

       .letter-m {
         color: #3a8ed7;
       }

       .letter-s2 {
         color: #7fc1f0;
       }

       /* Registration form overlay */
       .register-overlay {
         position: absolute;
         top: 0;
         left: 0;
         width: 100%;
         height: 100%;
         display: flex;
         justify-content: center;
         align-items: center;
         z-index: 10;
       }

       .register-form-container {
         padding: 1rem;
         max-width: 600px;
         width: 100%;
       }

       .register-card {
         background: rgba(255, 255, 255, 0.95);
         backdrop-filter: blur(10px);
         padding: 3rem;
         border-radius: 20px;
         box-shadow: 0 20px 40px rgba(0,0,0,0.1);
         width: 100%;
         position: relative;
         z-index: 2;
       }

       .register-title {
         text-align: center;
         font-size: 1.875rem;
         font-weight: 800;
         color: #111827;
         margin-bottom: 0.5rem;
       }

       .register-subtitle {
         text-align: center;
         font-size: 0.875rem;
         color: #6b7280;
         margin-bottom: 2rem;
       }

       .signin-link {
         font-weight: 500;
         color: #2563eb;
         text-decoration: none;
       }

       .signin-link:hover {
         color: #1d4ed8;
       }

       .error-message {
         background-color: #fef2f2;
         border: 1px solid #fecaca;
         color: #dc2626;
         padding: 0.75rem 1rem;
         border-radius: 0.375rem;
         margin-bottom: 1.5rem;
       }

       .register-form {
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
         border: 1px solid #6e6f74ff;
         border-radius: 0.375rem;
         box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
         font-size: 0.875rem;
         line-height: 1.25rem;
         box-sizing: border-box;
         color: #6e6f74ff;
       }

       .form-input:focus {
         outline: 2px solid transparent;
         outline-offset: 2px;
         border-color: #3b82f6;
         box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
       }

       .field-error {
         margin-top: 0.25rem;
         font-size: 0.875rem;
         color: #dc2626;
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
        
         .register-card {
           padding: 2rem;
         }

         .register-form-container {
           padding: 1rem;
         }
       }
     `}</style>
   </>
 );
}