// components/LogoutRoute.tsx

import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function LogoutRoute() {
  const { signOut } = useAuth();

  useEffect(() => {
    signOut();
  }, []);

  return <Navigate to="/login" replace />;
}