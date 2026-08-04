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

function App() {
  return (
    <div className="App">
      <BrowserRouter>
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
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
