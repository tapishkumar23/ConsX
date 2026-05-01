import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../Supabase/supabase";
import type { Session, User } from "@supabase/supabase-js";

/* ✅ Strong role typing (FIXES your TS issue) */
type Role = "employee" | "manager" | "ceo" | "hr" | "backend_employee";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  role: Role | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  /* ✅ Fetch role + auto-create user */
  const fetchRole = async (userId: string, email?: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("ROLE FETCH ERROR:", error);
        setRole("employee");
        return;
      }

      /* 🚨 Auto-create user row if missing */
      if (!data) {
        const { error: insertError } = await supabase.from("users").insert({
          id: userId,
          email: email || "",
          role: "employee",
        });

        if (insertError) {
          console.error("USER AUTO-CREATE ERROR:", insertError);
        }

        setRole("employee");
        return;
      }

      setRole((data.role as Role) || "employee");
    } catch (err) {
      console.error("ROLE ERROR:", err);
      setRole("employee");
    }
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();

        if (!isMounted) return;

        const currentSession = data.session;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          fetchRole(currentSession.user.id, currentSession.user.email);
        } else {
          setRole(null);
        }
      } catch (err) {
        console.error("INIT ERROR:", err);
      } finally {
        if (isMounted) setLoading(false); // ✅ always stop loader
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchRole(session.user.id, session.user.email);
      } else {
        setRole(null);
      }

      setLoading(false); // ✅ critical
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* ✅ Debug (safe + useful) */
  console.log("AUTH STATE:", {
    session: !!session,
    user: user?.email,
    role,
    loading,
  });

  return (
    <AuthContext.Provider value={{ session, user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);