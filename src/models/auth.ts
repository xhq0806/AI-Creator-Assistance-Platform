import { useCallback, useState } from 'react';
import { flushSync } from 'react-dom';
import { history } from 'umi';
import type { CurrentUser } from '@/app';
import { login, register } from '@/services/api';

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

  const signIn = useCallback(async (account: string, password: string) => {
    const user = await login({ account, password });
    window.localStorage.setItem('ai_creator_user', JSON.stringify(user));
    flushSync(() => {
      setCurrentUser(user);
    });
    history.push('/creator?restore=latest');
  }, []);

  const signUp = useCallback(async (payload: { username: string; password: string; phone?: string; email?: string }) => {
    const user = await register(payload);
    window.localStorage.setItem('ai_creator_user', JSON.stringify(user));
    flushSync(() => {
      setCurrentUser(user);
    });
    history.push('/creator?restore=latest');
  }, []);

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
