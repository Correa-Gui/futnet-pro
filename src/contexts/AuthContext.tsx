import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  profile: Database['public']['Tables']['profiles']['Row'] | null;
  studentProfile: { id: string; plan_id: string | null; invoice_due_day: number | null } | null;
  /** null = super admin (no menu restriction); string[] = allowed menu keys */
  allowedMenus: string[] | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshStudentProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<Database['public']['Tables']['profiles']['Row'] | null>(null);
  const [studentProfile, setStudentProfile] = useState<{ id: string; plan_id: string | null; invoice_due_day: number | null } | null>(null);
  const [allowedMenus, setAllowedMenus] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  // Guard against double-setting loading from both getSession and onAuthStateChange
  const initializedRef = useRef(false);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const [roleResult, profileResult] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', userId).single(),
        supabase.from('profiles').select('*').eq('user_id', userId).single(),
      ]);

      if (roleResult.error) {
        console.error('Failed to fetch user role:', roleResult.error.message);
      }
      if (profileResult.error) {
        console.error('Failed to fetch user profile:', profileResult.error.message);
      }

      const fetchedRole = roleResult.data?.role ?? null;
      const fetchedProfile = profileResult.data ?? null;

      setRole(fetchedRole);
      setProfile(fetchedProfile);

      // Fetch student profile to check if plan is assigned
      if (fetchedRole === 'student') {
        const { data: sp } = await supabase
          .from('student_profiles')
          .select('id, plan_id, invoice_due_day')
          .eq('user_id', userId)
          .single();
        setStudentProfile(sp ? { id: sp.id, plan_id: sp.plan_id ?? null, invoice_due_day: sp.invoice_due_day ?? null } : null);
      } else {
        setStudentProfile(null);
      }

      // Fetch allowed menus for admins that have a specific admin_role assigned.
      // admin_role_id = null means super admin → no restrictions (allowedMenus = null).
      if (fetchedRole === 'admin' && fetchedProfile?.admin_role_id) {
        const { data: adminRoleData } = await supabase
          .from('admin_roles')
          .select('allowed_menus')
          .eq('id', fetchedProfile.admin_role_id)
          .single();
        setAllowedMenus(adminRoleData?.allowed_menus ?? null);
      } else {
        setAllowedMenus(null);
      }
    } catch (err) {
      console.error('Unexpected error fetching user data:', err);
      setRole(null);
      setProfile(null);
      setStudentProfile(null);
      setAllowedMenus(null);
    }
  }, []);

  useEffect(() => {
    // 1. Get the current session first (synchronous-ish)
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        fetchUserData(currentSession.user.id).finally(() => {
          initializedRef.current = true;
          setLoading(false);
        });
      } else {
        initializedRef.current = true;
        setLoading(false);
      }
    });

    // 2. Listen to future auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Use setTimeout(0) to avoid Supabase RLS deadlock when the auth
          // state change fires synchronously during token refresh. The RLS
          // policies call has_role() which queries user_roles — doing that
          // inside the same synchronous callback can deadlock the connection.
          setTimeout(async () => {
            await fetchUserData(newSession.user.id);
            if (initializedRef.current) {
              // Only set loading if we're past initialization
            }
          }, 0);
        } else {
          setRole(null);
          setProfile(null);
          setAllowedMenus(null);
        }

        // Don't set loading=false here during initialization — getSession handles that
        if (initializedRef.current) {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error as Error | null };
  };

  const refreshStudentProfile = useCallback(async () => {
    if (!user) return;
    const { data: sp } = await supabase
      .from('student_profiles')
      .select('id, plan_id, invoice_due_day')
      .eq('user_id', user.id)
      .single();
    setStudentProfile(sp ? { id: sp.id, plan_id: sp.plan_id ?? null, invoice_due_day: sp.invoice_due_day ?? null } : null);
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
    setStudentProfile(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{ user, session, role, profile, studentProfile, allowedMenus, loading, signIn, signUp, signOut, resetPassword, refreshStudentProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
