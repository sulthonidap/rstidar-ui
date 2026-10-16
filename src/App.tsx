import { Route, Routes } from 'react-router';

import GuestRoute from '@/components/GuestRoute';
import AdminLayout from '@/components/layout/AdminLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import CouriersPage from '@/pages/couriers/CouriersPage';
import DashboardPage from '@/pages/DashboardPage';
import KioskPage from '@/pages/kiosk/KioskPage';
import NotFoundPage from '@/pages/NotFoundPage';
import LoginGate from '@/pages/setup/LoginGate';
import CustomersPage from '@/pages/customers/CustomersPage';
import RecapPage from '@/pages/reports/RecapPage';
import PaymentSettingsPage from '@/pages/settings/PaymentSettingsPage';
import CreateOrderPage from '@/pages/orders/CreateOrderPage';
import OrderDetailPage from '@/pages/orders/OrderDetailPage';
import OrdersListPage from '@/pages/orders/OrdersListPage';
import OrganizationSettingsPage from '@/pages/settings/OrganizationSettingsPage';
import PublicLayout from '@/pages/public/PublicLayout';
import PublicOrderFormPage from '@/pages/public/PublicOrderFormPage';
import PublicOrderSuccessPage from '@/pages/public/PublicOrderSuccessPage';
import TrackOrderPage from '@/pages/public/TrackOrderPage';
import ServicesPage from '@/pages/services/ServicesPage';
import TransactionsPage from '@/pages/transactions/TransactionsPage';
import UsersPage from '@/pages/users/UsersPage';

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginGate />
          </GuestRoute>
        }
      />

      {/* Kiosk: the order form full-screen on a shared touch screen at the RS. */}
      <Route path="/kios" element={<KioskPage />} />

      {/* Public pages — no login. */}
      <Route element={<PublicLayout />}>
        <Route path="/order" element={<PublicOrderFormPage />} />
        <Route path="/order/:code/selesai" element={<PublicOrderSuccessPage />} />
        <Route path="/lacak/:code?" element={<TrackOrderPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="orders" element={<OrdersListPage />} />
        <Route path="orders/baru" element={<CreateOrderPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="rekap" element={<RecapPage />} />
        <Route path="pengaturan/pembayaran" element={<PaymentSettingsPage />} />
        <Route path="couriers" element={<CouriersPage />} />
        <Route path="pengaturan/rs" element={<OrganizationSettingsPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
      </Route>
    </Routes>
  );
}
