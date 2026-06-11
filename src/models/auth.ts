import { useCallback, useState } from 'react';
import { flushSync } from 'react-dom';
import { history } from 'umi';
import type { CurrentUser } from '@/app';
import { login, register } from '@/services/api';

const DEFAULT_POST_AUTH_REDIRECT = '/creator?restore=latest';

function readStoredUser() {
  const rawUser = window.localStorage.getItem('ai_creator_user');
  if (!rawUser) {
    return undefined;
  }

  try {
    return JSON.parse(rawUser) as CurrentUser;
  } catch {
    window.localStorage.removeItem('ai_creator_user');
    return undefined;
  }
}

function getPostAuthRedirect() {
  const redirect = new URLSearchParams(window.location.search).get('redirect');
  if (!redirect) {
    return DEFAULT_POST_AUTH_REDIRECT;
  }

  const isSafeRelativePath =
    redirect.startsWith('/') &&
    !redirect.startsWith('//') &&
    !redirect.includes('://') &&
    redirect.trim() === redirect;

  return isSafeRelativePath ? redirect : DEFAULT_POST_AUTH_REDIRECT;
}

export default function useAuthModel() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | undefined>(() => readStoredUser());

  const updateCurrentUser = useCallback((payload: Partial<CurrentUser>) => {
    flushSync(() => {
      setCurrentUser((current) => {
        if (!current) {
          return current;
        }
        const nextUser = { ...current, ...payload };
        window.localStorage.setItem('ai_creator_user', JSON.stringify(nextUser));
        return nextUser;
      });
    });
  }, []);

  const completeAuth = useCallback((user: CurrentUser) => {
    window.localStorage.setItem('ai_creator_user', JSON.stringify(user));
    flushSync(() => {
      setCurrentUser(user);
    });
    history.push(getPostAuthRedirect());
  }, []);

  const signIn = useCallback(async (account: string, password: string) => {
    const user = await login({ account, password });
    completeAuth(user);
  }, [completeAuth]);

  const signUp = useCallback(async (payload: { username: string; password: string; phone?: string; email?: string }) => {
    const user = await register(payload);
    completeAuth(user);
  }, [completeAuth]);

  const signOut = useCallback(() => {
    window.localStorage.removeItem('ai_creator_user');
    flushSync(() => {
      setCurrentUser(undefined);
    });
    history.push('/login');
  }, []);

  return {
    currentUser,
    isLoggedIn: Boolean(currentUser?.token),
    signIn,
    signUp,
    signOut,
    updateCurrentUser,
  };
}
