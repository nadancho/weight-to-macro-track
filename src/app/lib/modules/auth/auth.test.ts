import { describe, it, expect, vi, beforeEach } from "vitest";
import { signIn, signOut, signUp, getSession, updatePassword } from "./index";

const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
const mockGetUser = vi.fn();
const mockUpdateUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/app/lib/integrations/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        signInWithPassword: mockSignInWithPassword,
        signUp: mockSignUp,
        signOut: mockSignOut,
        getSession: mockGetSession,
        getUser: mockGetUser,
        updateUser: mockUpdateUser,
      },
      from: mockFrom,
    })
  ),
}));

describe("auth module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      insert: vi.fn().mockReturnThis(),
    });
  });

  describe("signIn", () => {
    it("returns success when signInWithPassword succeeds", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: "user-1" }, session: {} },
        error: null,
      });
      const result = await signIn("a@b.co", "1234");
      expect(result.success).toBe(true);
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "a@b.co",
        password: "1234",
      });
    });

    it("returns failure when signInWithPassword returns error", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login" },
      });
      const result = await signIn("a@b.co", "wrong");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid login");
    });
  });

  describe("signUp", () => {
    it("returns success when signUp succeeds", async () => {
      mockSignUp.mockResolvedValue({
        data: { user: { id: "user-1" }, session: {} },
        error: null,
      });
      const result = await signUp("a@b.co", "123456");
      expect(result.success).toBe(true);
      expect(mockSignUp).toHaveBeenCalledWith({
        email: "a@b.co",
        password: "123456",
      });
    });

    it("returns failure when signUp returns error", async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "User already registered" },
      });
      const result = await signUp("a@b.co", "123456");
      expect(result.success).toBe(false);
      expect(result.error).toBe("User already registered");
    });
  });

  describe("signOut", () => {
    it("calls supabase auth signOut", async () => {
      mockSignOut.mockResolvedValue(undefined);
      await signOut();
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe("getSession", () => {
    it("returns session when getSession returns data", async () => {
      const session = { user: { id: "user-1" } };
      mockGetSession.mockResolvedValue({ data: { session } });
      const result = await getSession();
      expect(result).toEqual(session);
    });

    it("returns null when getSession returns no session", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      const result = await getSession();
      expect(result).toBeNull();
    });
  });

  describe("updatePassword", () => {
    it("returns success when updateUser succeeds", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });
      mockUpdateUser.mockResolvedValue({ data: { user: {} }, error: null });
      const result = await updatePassword("newpin6");
      expect(result.success).toBe(true);
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: "newpin6" });
    });

    it("returns failure when not authenticated", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });
      const result = await updatePassword("newpin6");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it("returns failure when updateUser returns error", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });
      mockUpdateUser.mockResolvedValue({
        data: null,
        error: { message: "Password too weak" },
      });
      const result = await updatePassword("newpin6");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Password too weak");
    });
  });
});
