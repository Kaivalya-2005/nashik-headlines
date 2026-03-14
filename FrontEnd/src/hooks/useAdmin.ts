/**
 * useAdmin — hook for admin authentication state.
 * Checks if current user has the admin role via the database.
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setUserId(session.user.id);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin");

      setIsAdmin(!!roles && roles.length > 0);
      setLoading(false);
    };

    // Set up listener first, then check
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdmin();
    });

    checkAdmin();

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setUserId(null);
  };

  return { isAdmin, loading, userId, signOut };
}
