"use client";

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import { useRouter } from "next/navigation";

const DEFAULTS = {
  userCookie: "authData",
  accessCookie: "accessToken",
  refreshCookie: "refreshToken",
};

const AuthContext = createContext({
  user: null,
  tokens: { accessToken: null, refreshToken: null },
  isChecking: false,
  isAuthenticated: false,
  setUser: () => {},
  refreshFromCookies: () => {},
  clearAuth: () => {},
});

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[2]) : null;
}
function tryParse(s) { try { return JSON.parse(s); } catch { return null; } }

// Heuristic: authData JSON ichidan token nomlarini qidirish
function extractTokensFromUser(userObj) {
  if (!userObj || typeof userObj !== "object") return { accessToken: null, refreshToken: null };
  const candidates = [
    ["accessToken", "refreshToken"],
    ["access_token", "refresh_token"],
    ["token", "refreshToken"],
    ["jwt", "refreshToken"],
    ["tokens", "tokens"], // { tokens: { accessToken, refreshToken } }
  ];

  for (const [a, r] of candidates) {
    if (a === "tokens" && userObj.tokens && typeof userObj.tokens === "object") {
      const at = userObj.tokens.accessToken || userObj.tokens.access_token || null;
      const rt = userObj.tokens.refreshToken || userObj.tokens.refresh_token || null;
      if (at || rt) return { accessToken: at, refreshToken: rt };
    } else {
      const at = userObj[a];
      const rt = userObj[r];
      if (at || rt) return { accessToken: at || null, refreshToken: rt || null };
    }
  }
  return { accessToken: null, refreshToken: null };
}

export function AuthProvider({
  children,
  initialUserData = null,
  cookieNames = DEFAULTS,
  pollMs = 800,
  /** ixtiyoriy: userObj dan tokenlarni qanday olishni o'zingiz belgilash */
  tokenSelector, // (userObj) => ({ accessToken, refreshToken })
}) {
  const router = useRouter();
  const { userCookie, accessCookie, refreshCookie } = { ...DEFAULTS, ...cookieNames };

  const [user, setUser] = useState(
    initialUserData ? tryParse(initialUserData) || initialUserData : null
  );
  const [tokens, setTokens] = useState({ accessToken: null, refreshToken: null });
  const [isChecking, setIsChecking] = useState(false);

  const readAllCookies = useCallback(() => {
    const rawUser = getCookie(userCookie);
    const nextUser = rawUser ? tryParse(rawUser) || rawUser : null;

    // 1) separate cookie'lardan urinamiz
    let accessToken = getCookie(accessCookie);
    let refreshToken = getCookie(refreshCookie);

    // 2) agar topilmasa, user JSON ichidan olishga harakat qilamiz
    if (!accessToken && !refreshToken && nextUser && typeof nextUser === "object") {
      const viaUser = tokenSelector
        ? tokenSelector(nextUser)
        : extractTokensFromUser(nextUser);
      accessToken = viaUser.accessToken || null;
      refreshToken = viaUser.refreshToken || null;
    }

    return {
      user: nextUser,
      tokens: { accessToken, refreshToken },
    };
  }, [userCookie, accessCookie, refreshCookie, tokenSelector]);

  const refreshFromCookies = useCallback(
    (opts = { triggerRefresh: true }) => {
      const next = readAllCookies();

      setUser((prev) => {
        const changed = JSON.stringify(prev) !== JSON.stringify(next.user);
        return changed ? next.user : prev;
      });

      setTokens((prev) => {
        const changed =
          prev.accessToken !== next.tokens.accessToken ||
          prev.refreshToken !== next.tokens.refreshToken;
        return changed ? next.tokens : prev;
      });

      setIsChecking(false);
      if (opts.triggerRefresh) router.refresh();
    },
    [readAllCookies, router]
  );

  useEffect(() => {
    // birinchi marta o'qish
    refreshFromCookies({ triggerRefresh: false });

    // soddalashtirilgan polling: har pollMs da yangila
    const id = setInterval(() => {
      refreshFromCookies({ triggerRefresh: false });
    }, pollMs);

    // fokusda ham yangilash
    const onFocus = () => refreshFromCookies({ triggerRefresh: false });
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [pollMs, refreshFromCookies]);

  const isAuthenticated = Boolean(tokens.accessToken);

  const clearAuth = useCallback(() => {
    setUser(null);
    setTokens({ accessToken: null, refreshToken: null });
    if (typeof document !== "undefined") {
      document.cookie = "authData=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      tokens,
      isChecking,
      isAuthenticated,
      setUser,
      refreshFromCookies,
      clearAuth,
    }),
    [user, tokens, isChecking, isAuthenticated, refreshFromCookies, clearAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
