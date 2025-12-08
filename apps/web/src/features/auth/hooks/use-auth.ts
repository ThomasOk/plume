import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { env } from '@/env';
import { authClient } from '@/lib/authClient';

export const useAuth = () => {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const user = session?.user ?? null;
  const isAuthenticated = !!user;
  const isLoading = isPending;

  const login = async (credentials: { email: string; password: string }) => {
    try {
      const { error } = await authClient.signIn.email(credentials, {
        onSuccess: () => {
          toast.success('Welcome back!');
          navigate({ to: '/' });
        },
      });

      if (error) {
        toast.error(error.message ?? 'Login failed');
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
  }) => {
    try {
      const { error } = await authClient.signUp.email(data, {
        onSuccess: () => {
          toast.success('Account created successfully!');
          navigate({ to: '/' });
        },
      });

      if (error) {
        toast.error(error.message ?? 'Registration failed');
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await authClient.signOut();
      toast.info('You have been logged out');
      navigate({ to: '/' });
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const signInWithGoogle = async () => {
    setIsGoogleLoading(true);
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: env.PUBLIC_WEB_URL,
      });
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Google sign in failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const redirectToLogin = () => {
    navigate({ to: '/sign-in' });
  };

  const redirectToRegister = () => {
    navigate({ to: '/sign-up' });
  };

  return {
    user,
    session,
    isAuthenticated,
    isLoading,
    isGoogleLoading,

    login,
    signInWithGoogle,
    register,
    logout,

    redirectToLogin,
    redirectToRegister,
  };
};
