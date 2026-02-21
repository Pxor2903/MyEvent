import React, { useState, useEffect } from 'react';
import type { User, AuthMode, RegisterData } from '@/core/types';
import { authService, supabase } from '@/api';
import { Capacitor } from '@capacitor/core';
import { AuthLayout } from './components/AuthLayout';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { Home } from './components/Home';
import { Toast } from './components/Toast';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Précharge le plugin Contacts en natif pour que la demande d’accès s’affiche (iOS affiche « Contacts » dans Réglages après la 1re demande).
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor-community/contacts').catch(() => {});
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    authService.initSocialProviders();

    const syncUserFromDb = async () => {
      const user = await authService.getCurrentUser();
      if (isMounted) setCurrentUser(user);
      return user;
    };

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        syncUserFromDb();
      } else {
        setCurrentUser(null);
      }
      setIsInitializing(false);
    });

    const init = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('code')) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          const sessionUser = data?.session?.user;
          if (error && !sessionUser) {
            const { data: fallbackSession } = await supabase.auth.getSession();
            if (!fallbackSession.session?.user) {
              showToast("Échec de connexion Google. Réessaie.", "error");
            }
          }
          if (sessionUser && isMounted) {
            await syncUserFromDb();
          }
          if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('auth_redirect_origin');
          window.history.replaceState({}, document.title, window.location.pathname);
          if (isMounted) setIsInitializing(false);
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        if (isMounted) {
          if (sessionData.session?.user) {
            await syncUserFromDb();
          } else {
            setCurrentUser(null);
          }
          setIsInitializing(false);
        }
      } catch {
        if (isMounted) setIsInitializing(false);
      }
    };

    init();

    return () => {
      isMounted = false;
      authSubscription?.subscription?.unsubscribe();
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const handleLogin = async (email: string, mdp: string) => {
    setIsLoading(true);
    const result = await authService.login(email, mdp);
    setIsLoading(false);
    
    if (result.success && result.user) {
      setCurrentUser(result.user);
      setNotice(null);
      showToast("Connexion réussie. Bienvenue !", "success");
    } else {
      const errorMsg = result.error || "Une erreur est survenue";
      if (errorMsg.toLowerCase().includes('confirm')) {
        setNotice("Confirme ton email pour activer le compte.");
      }
      showToast(errorMsg, "error");
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setNotice(null);
    setSocialLoading(provider);
    const result = await authService.loginWithProvider(provider);
    setSocialLoading(null);
    
    if (result.success) {
      showToast("Redirection vers le fournisseur…", "success");
    } else {
      showToast(result.error || "La connexion sociale a échoué", "error");
    }
  };

  const handleRegister = async (data: RegisterData) => {
    setIsLoading(true);
    const result = await authService.register(data);
    setIsLoading(false);
    
    if (result.success && result.user) {
      setCurrentUser(result.user);
      setNotice(null);
      showToast("Votre compte a été créé avec succès !", "success");
    } else if (result.needsEmailConfirmation) {
      setNotice(`Un email de confirmation a été envoyé à ${data.email}.`);
      showToast("Confirmez votre email pour activer le compte.", "success");
    } else {
      showToast(result.error || "Erreur lors de l'inscription", "error");
    }
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    showToast("Déconnexion réussie", "success");
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      {currentUser ? (
        <Home user={currentUser} onLogout={handleLogout} />
      ) : (
        <AuthLayout>
          <div className="space-y-6">
            {notice && (
              <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold">
                {notice}
              </div>
            )}
            {authMode === 'login' ? (
            <LoginForm 
              onSubmit={handleLogin} 
              onSocialSubmit={handleSocialLogin}
              isLoading={isLoading} 
              socialLoading={socialLoading}
              onSwitch={() => setAuthMode('register')} 
            />
          ) : (
            <RegisterForm 
              onSubmit={handleRegister} 
              onSocialSubmit={handleSocialLogin}
              isLoading={isLoading} 
              socialLoading={socialLoading}
              onSwitch={() => setAuthMode('login')} 
            />
          )}
          </div>
        </AuthLayout>
      )}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  );
};

export default App;
