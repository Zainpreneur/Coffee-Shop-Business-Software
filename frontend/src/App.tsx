import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PosPage } from "./pages/PosPage";
import { OrdersPage } from "./pages/OrdersPage";
import { MenuPage } from "./pages/MenuPage";
import { InventoryPage } from "./pages/InventoryPage";
import { CustomersPage } from "./pages/CustomersPage";
import { StaffPage } from "./pages/StaffPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/pos" element={<PosPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route element={<ProtectedRoute roles={["admin", "manager"]} />}>
                <Route path="/menu" element={<MenuPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
              </Route>
              <Route path="/customers" element={<CustomersPage />} />
              <Route element={<ProtectedRoute roles={["admin"]} />}>
                <Route path="/staff" element={<StaffPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
