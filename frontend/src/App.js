import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardPage from "@/pages/DashboardPage";
import ExpensesPage from "@/pages/ExpensesPage";
import HrmsDashboardPage from "@/pages/hrms/HrmsDashboardPage";
import EmployeesPage from "@/pages/hrms/EmployeesPage";
import AttendancePage from "@/pages/hrms/AttendancePage";
import LeavesPage from "@/pages/hrms/LeavesPage";
import PayrollPage from "@/pages/hrms/PayrollPage";
import ReportsPage from "@/pages/hrms/ReportsPage";
import SettingsPage from "@/pages/hrms/SettingsPage";
import BillingPage from "@/pages/billing/BillingPage";
import DiscomPage from "@/pages/discom/DiscomPage";
import AdminLogin from "@/pages/admin/AdminLogin";
import ForgotPassword from "@/pages/admin/ForgotPassword";
import ResetPassword from "@/pages/admin/ResetPassword";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import UsersPage from "@/pages/admin/UsersPage";
import ResourcesPage from "@/pages/admin/ResourcesPage";
import ActivityLogPage from "@/pages/admin/ActivityLogPage";
import AdminRoute from "@/components/admin/AdminRoute";
import QuickExpenseFAB from "@/components/QuickExpenseFAB";
import OfflineBanner from "@/components/OfflineBanner";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <OfflineBanner />
        <QuickExpenseFAB />
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/hrms" element={<HrmsDashboardPage />} />
          <Route path="/hrms/employees" element={<EmployeesPage />} />
          <Route path="/hrms/attendance" element={<AttendancePage />} />
          <Route path="/hrms/leaves" element={<LeavesPage />} />
          <Route path="/hrms/payroll" element={<PayrollPage />} />
          <Route path="/hrms/reports" element={<ReportsPage />} />
          <Route path="/hrms/settings" element={<SettingsPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/discom" element={<DiscomPage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/forgot-password" element={<ForgotPassword />} />
          <Route path="/admin/reset-password" element={<ResetPassword />} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
          <Route path="/admin/resources" element={<AdminRoute><ResourcesPage /></AdminRoute>} />
          <Route path="/admin/activity" element={<AdminRoute><ActivityLogPage /></AdminRoute>} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
