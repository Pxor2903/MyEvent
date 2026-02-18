
import React from 'react';
import { Logo } from '../constants';

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white overflow-hidden">
      {/* Left side: Branding/Visual */}
      <div className="hidden md:flex md:w-1/2 bg-indigo-600 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800"></div>
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-white">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-tight">myEvent</span>
          </div>
        </div>

        <div className="relative z-10 text-white space-y-6">
          <h1 className="text-5xl font-extrabold leading-tight">
            Gérez vos événements <br/> comme un pro.
          </h1>
          <p className="text-indigo-100 text-lg max-w-md">
            Simplifiez l'organisation, boostez la participation et créez des expériences mémorables avec notre plateforme tout-en-un.
          </p>
          <div className="flex -space-x-3 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <img 
                key={i} 
                className="inline-block h-10 w-10 rounded-full ring-2 ring-indigo-500" 
                src={`https://picsum.photos/100/100?random=${i}`} 
                alt="user"
              />
            ))}
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-white/20 backdrop-blur-md text-xs font-medium text-white ring-2 ring-indigo-500">
              +50k
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Form */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-12 overflow-y-auto bg-gray-100/80" id="main-content">
        <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-lg shadow-gray-200/60 p-6 sm:p-8 md:p-10 border border-gray-100">
          {children}
        </div>
      </main>
    </div>
  );
};
