import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import queryClient from "./api/queryClient";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Bills from "./pages/Bills";
import CashManagement from "./pages/CashManagement";
import Store from "./pages/Store";
import MasterBrands from "./pages/MasterBrands";
import Brands from "./pages/Brands";
import Category from "./pages/Category";
import Model from "./pages/Model";
import Unit from "./pages/Unit";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import TaxRates from "./pages/TaxRates";
import PriceGroups from "./pages/PriceGroups";
import ComingSoon from "./pages/ComingSoon";
import PurchaseRequisition from "./pages/PurchaseRequisition";
import ProductRequests from "./pages/ProductRequests";
import DefectiveStock from "./pages/DefectiveStock";
import Barcode from "./pages/Barcode";
import Expense from "./pages/Expense";
import Reports from "./pages/Reports";
import Customers from "./pages/Customers";
import Staff from "./pages/Staff";
import BannersAds from "./pages/BannersAds";
import Notifications from "./pages/Notifications";
import LoginHistory from "./pages/LoginHistory";
import BackupRestore from "./pages/BackupRestore";

const protectedRoutes = [
  "/messaging",
];

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/bills" element={<ProtectedRoute><AppLayout><Bills /></AppLayout></ProtectedRoute>} />
            <Route path="/cash-management" element={<ProtectedRoute><AppLayout><CashManagement /></AppLayout></ProtectedRoute>} />
            <Route path="/store" element={<ProtectedRoute><AppLayout><Store /></AppLayout></ProtectedRoute>} />
            <Route path="/master-brands" element={<ProtectedRoute><AppLayout><MasterBrands /></AppLayout></ProtectedRoute>} />
            <Route path="/brands" element={<ProtectedRoute><AppLayout><Brands /></AppLayout></ProtectedRoute>} />
            <Route path="/category" element={<ProtectedRoute><AppLayout><Category /></AppLayout></ProtectedRoute>} />
            <Route path="/model" element={<ProtectedRoute><AppLayout><Model /></AppLayout></ProtectedRoute>} />
            <Route path="/unit" element={<ProtectedRoute><AppLayout><Unit /></AppLayout></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute><AppLayout><Products /></AppLayout></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><AppLayout><Inventory /></AppLayout></ProtectedRoute>} />
            <Route path="/tax-rates" element={<ProtectedRoute><AppLayout><TaxRates /></AppLayout></ProtectedRoute>} />
            <Route path="/price-group" element={<ProtectedRoute><AppLayout><PriceGroups /></AppLayout></ProtectedRoute>} />
            <Route path="/purchase-requisition" element={<ProtectedRoute><AppLayout><PurchaseRequisition /></AppLayout></ProtectedRoute>} />
            <Route path="/product-requests" element={<ProtectedRoute><AppLayout><ProductRequests /></AppLayout></ProtectedRoute>} />
            <Route path="/defective-stock" element={<ProtectedRoute><AppLayout><DefectiveStock /></AppLayout></ProtectedRoute>} />
            <Route path="/barcode" element={<ProtectedRoute><AppLayout><Barcode /></AppLayout></ProtectedRoute>} />
            <Route path="/expense" element={<ProtectedRoute><AppLayout><Expense /></AppLayout></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><AppLayout><Reports /></AppLayout></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><AppLayout><Customers /></AppLayout></ProtectedRoute>} />
            <Route path="/staff" element={<ProtectedRoute><AppLayout><Staff /></AppLayout></ProtectedRoute>} />
            <Route path="/banners-ads" element={<ProtectedRoute><AppLayout><BannersAds /></AppLayout></ProtectedRoute>} />
            <Route path="/notification" element={<ProtectedRoute><AppLayout><Notifications /></AppLayout></ProtectedRoute>} />
            <Route path="/login-history" element={<ProtectedRoute><AppLayout><LoginHistory /></AppLayout></ProtectedRoute>} />
            <Route path="/backup-restore" element={<ProtectedRoute><AppLayout><BackupRestore /></AppLayout></ProtectedRoute>} />
            {protectedRoutes.map((path) => (
              <Route
                key={path}
                path={path}
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ComingSoon />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
            ))}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
