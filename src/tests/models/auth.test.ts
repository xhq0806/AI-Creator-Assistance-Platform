import { act, renderHook } from "@testing-library/react";

const mockHistoryPush = jest.fn();
const mockLogin = jest.fn();
const mockRegister = jest.fn();

jest.mock("umi", () => ({
  history: {
    push: mockHistoryPush,
  },
}));

jest.mock("@/services/api", () => ({
  login: mockLogin,
  register: mockRegister,
}));

import useAuthModel from "@/models/auth";

describe("useAuthModel login redirect", () => {
  beforeEach(() => {
    localStorage.clear();
    mockHistoryPush.mockClear();
    mockLogin.mockReset();
    mockRegister.mockReset();
    window.history.replaceState(null, "", "/login");
  });

  it("redirects signIn to a safe relative redirect query value", async () => {
    mockLogin.mockResolvedValue({
      id: 1,
      username: "admin",
      role: "admin",
      token: "token",
    });
    window.history.replaceState(null, "", "/login?redirect=%2Faudit%3Ftab%3Dreports");

    const { result } = renderHook(() => useAuthModel());

    await act(async () => {
      await result.current.signIn("admin", "admin123");
    });

    expect(mockHistoryPush).toHaveBeenCalledWith("/audit?tab=reports");
  });

  it.each([
    "https://evil.example/path",
    "//evil.example/path",
    "javascript:alert(1)",
    "creator",
  ])("falls back to creator restore URL for unsafe redirect %s", async (redirect) => {
    mockLogin.mockResolvedValue({
      id: 1,
      username: "admin",
      role: "admin",
      token: "token",
    });
    window.history.replaceState(
      null,
      "",
      `/login?redirect=${encodeURIComponent(redirect)}`
    );

    const { result } = renderHook(() => useAuthModel());

    await act(async () => {
      await result.current.signIn("admin", "admin123");
    });

    expect(mockHistoryPush).toHaveBeenCalledWith("/creator?restore=latest");
  });

  it("uses the same redirect completion for signUp", async () => {
    mockRegister.mockResolvedValue({
      id: 2,
      username: "creator",
      role: "user",
      token: "token",
    });
    window.history.replaceState(null, "", "/login?redirect=%2Fworkspace%3Fdraft%3D1");

    const { result } = renderHook(() => useAuthModel());

    await act(async () => {
      await result.current.signUp({ username: "creator", password: "Password1" });
    });

    expect(mockHistoryPush).toHaveBeenCalledWith("/workspace?draft=1");
  });
});
