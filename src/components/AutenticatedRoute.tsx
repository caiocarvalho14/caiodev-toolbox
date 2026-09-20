// components/AutenticatedRoute.tsx

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LoaderCircle } from "lucide-react";

export function AutenticatedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen w-full flex items-center justify-center">
    <LoaderCircle className="w-7 h-7 animate-spin text-indigo-500" />
  </div>;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}   