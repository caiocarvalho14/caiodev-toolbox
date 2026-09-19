import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useRouteAccess } from "../contexts/RouteAccessContext";
import { PageLayoutSkeleton } from "../components/PageLayoutSkeleton";

interface RouteAccessGuardProps {
  redirectTo?: string;
}

// Assume que já passou pelo AutenticatedRoute — não checa user aqui.
export function RouteAccessGuard({ redirectTo = "/" }: RouteAccessGuardProps) {
  const { loading, temAcesso } = useRouteAccess();
  const location = useLocation();

  if (loading) return <PageLayoutSkeleton />;

  if (!temAcesso(location.pathname)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}