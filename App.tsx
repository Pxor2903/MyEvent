/**
 * Composant racine : état auth (currentUser), écrans Login/Register ou Home.
 * Précharge le plugin Contacts en natif (Capacitor) pour l’import d’invités.
 */
import React, { useState, useEffect } from 'react';
import type { User, AuthMode, RegisterData } from '@/core/types';
import { authService, supabase } from '@/api';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { AuthLayout } from './components/AuthLayout';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { V2Router } from './components/V2/V2Router';
import { Toast } from './components/Toast';
import { BrowserRouter } from 'react-router-dom';

function extractInvitationTokenFromUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    return url.searchParams.get('token');
  } catch {
    return null;
  }
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;
    const sub = CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      if (!active || !url) return;
      const token = extractInvitationTokenFromUrl(url);
      if (token) {
        window.history.pushState({}, '', `/repondre?token=${encodeURIComponent(token)}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    });

    CapacitorApp.getLaunchUrl()
      .then((result) => {
        if (!active || !result?.url) return;
        const token = extractInvitationTokenFromUrl(result.url);
        if (token) {
          window.history.pushState({}, '', `/repondre?token=${encodeURIComponent(token)}`);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      })
      .catch(() => {});

    return () => {
      active = false;
      void sub.then((s) => s.remove());
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    authService.initSocialProviders();

    const syncUserFromDb = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (!isMounted) return;
        setCurrentUser(user);
      } catch (e) {
        console.error('[Auth] syncUserFromDb:', e);
        if (!isMounted) return;
        setCurrentUser(null);
      } finally {
        if (isMounted) {
          setInitError(null);
          setIsInitializing(false);
        }
      }
    };

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        void syncUserFromDb();
      } else {
        setCurrentUser(null);
        setInitError(null);
        setIsInitializing(false);
      }
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
          if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('auth_redirect_origin');
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }
      } catch (e) {
        console.error('[Auth] init:', e);
      }
    };

    const timeout = setTimeout(() => {
      if (!isMounted) return;
      setIsInitializing(false);
      setInitError("Le chargement prend trop de temps. Vérifiez votre connexion.");
    }, 8000);
    init().finally(() => clearTimeout(timeout));

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <div className="text-4xl font-bold text-teal-500">myEvent</div>
        <div className="w-8 h-8 border-[3px] border-teal-100 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm font-semibold text-amber-800">{initError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden">
      <BrowserRouter>
        <V2Router
          user={currentUser}
          onLogout={handleLogout}
          authElement={
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
          }
        />
      </BrowserRouter>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
};

export default App;
