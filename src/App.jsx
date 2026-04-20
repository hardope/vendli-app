import './App.css';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import ProductDetailPage from './pages/ProductDetailPage.jsx';
import StorefrontSettingsPage from './pages/StorefrontSettingsPage.jsx';
import EditProductPage from './pages/EditProductPage.jsx';
import NewProductPage from './pages/NewProductPage.jsx';
import WalletPage from './pages/WalletPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import OrderDetailPage from './pages/OrderDetailPage.jsx';
import CustomersPage from './pages/CustomersPage.jsx';
import CustomerDetailPage from './pages/CustomerDetailPage.jsx';
import ReviewsPage from './pages/ReviewsPage.jsx';
import AuthRoute from './components/AuthRoute.jsx';
import { useAuthStore } from './store/auth.store.js';
import { useStoreStore } from './store/store.store.js';
import Toaster from './components/Toaster.jsx';

function AppShell({ children }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const signOut = useAuthStore((s) => s.signOut);
  const clearStores = useStoreStore((s) => s.clearStores);
  const navigate = useNavigate();

  const handleLogout = () => {
    signOut();
    clearStores();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 flex flex-col">{children}</main>
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/onboarding"
          element={(
            <AuthRoute>
              <OnboardingPage />
            </AuthRoute>
          )}
        />
        <Route
          path="/dashboard"
          element={(
            <AuthRoute>
              <DashboardPage />
            </AuthRoute>
          )}
        />
        <Route
          path="/orders"
          element={(
            <AuthRoute>
              <OrdersPage />
            </AuthRoute>
          )}
        />
        <Route
          path="/orders/:orderId"
          element={(
            <AuthRoute>
              <OrderDetailPage />
            </AuthRoute>
          )}
        />
        <Route
          path="/wallet"
          element={(
            <AuthRoute>
              <WalletPage />
            </AuthRoute>
          )}
        />
        <Route
          path="/products"
          element={(
            <AuthRoute>
              <ProductsPage />
            </AuthRoute>
          )}
        />
        <Route
          path="/products/:productId"
          element={(
            <AuthRoute>
              <ProductDetailPage />
            </AuthRoute>
          )}
        />
        <Route
          path="/products/new"
          element={(
            <AuthRoute>
              <NewProductPage />
            </AuthRoute>
          )}
        />
        <Route
          path="/products/:productId/edit"
          element={(
            <AuthRoute>
              <EditProductPage />
            </AuthRoute>
          )}
        />
        <Route
          path="/customers"
          element={(
            <AuthRoute>
              <CustomersPage />
            </AuthRoute>
          )}
        />
        <Route
          path="/customers/:customerId"
          element={(
            <AuthRoute>
              <CustomerDetailPage />
            </AuthRoute>
          )}
        />
        <Route
          path="/storefront-settings"
          element={(
            <AuthRoute>
              <StorefrontSettingsPage />
            </AuthRoute>
          )}
        />
        <Route
          path="/reviews"
          element={(
            <AuthRoute>
              <ReviewsPage />
            </AuthRoute>
          )}
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppShell>
  );
}

export default App;
