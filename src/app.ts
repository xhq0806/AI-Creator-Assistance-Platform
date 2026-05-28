export type CurrentUser = {
  id: number;
  username: string;
  phone?: string;
  email?: string;
  token: string;
};

export async function getInitialState(): Promise<{ currentUser?: CurrentUser }> {
  const rawUser = window.localStorage.getItem('ai_creator_user');
  if (!rawUser) {
    return {};
  }

  try {
    return { currentUser: JSON.parse(rawUser) as CurrentUser };
  } catch {
    window.localStorage.removeItem('ai_creator_user');
    return {};
  }
}
