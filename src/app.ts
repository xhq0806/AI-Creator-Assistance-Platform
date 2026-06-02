export interface CurrentUser {
  id: number;
  username: string;
  phone?: string;
  email?: string;
  token: string;
  refreshToken?: string;
}

export async function getInitialState() {
  try {
    const saved = window.localStorage.getItem("ai_creator_user");
    if (saved) {
      const user = JSON.parse(saved) as CurrentUser;
      return { currentUser: user, isLoggedIn: true };
    }
  } catch {
    // ignore
  }
  return { currentUser: null, isLoggedIn: false };
}
