import { Navigate } from "react-router-dom";
import { authApi } from "@/lib/adminApi";

export default function AdminRoute({ children, requireSuper = false }) {
  const user = authApi.getCachedUser();
  const hasToken = authApi.hasToken();
  if (!hasToken || !user) return <Navigate to="/admin/login" replace />;
  if (requireSuper && user.role !== "super_admin") return <Navigate to="/admin" replace />;
  return children;
}
