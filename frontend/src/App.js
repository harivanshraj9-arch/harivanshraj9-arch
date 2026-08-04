import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardPage from "@/pages/DashboardPage";
import ExpensesPage from "@/pages/ExpensesPage";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
