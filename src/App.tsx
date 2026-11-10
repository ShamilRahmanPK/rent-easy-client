import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { AdminLayout, Layout, OwnerLayout } from "./components/Layout";
import { RequireAuth } from "./components/RequireAuth";
import { Empty, Spinner } from "./components/ui";
import Account from "./pages/Account";
import ForgotPassword from "./pages/ForgotPassword";
import ListingDetail from "./pages/ListingDetail";
import Home from "./pages/Home";
import Listings from "./pages/Listings";
import Login from "./pages/Login";
import MyRentals from "./pages/MyRentals";
import Notifications from "./pages/Notifications";
import PropertyManage from "./pages/PropertyManage";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import AdminProperties from "./pages/admin/AdminProperties";
import Announcements from "./pages/admin/Announcements";
import AuditLog from "./pages/admin/AuditLog";
import People from "./pages/admin/People";
import PersonDetail from "./pages/admin/PersonDetail";
import RentRequests from "./pages/admin/RentRequests";
import ReviewDesk from "./pages/admin/ReviewDesk";
import Settings from "./pages/admin/Settings";
import Tenancies from "./pages/admin/Tenancies";
import MyProperties from "./pages/owner/MyProperties";
import ListWizard from "./pages/owner/ListWizard";

// Notification links say "/properties/:id". Owners and admins see different screens for the same property.
function PropertyRedirect() {
  const { id } = useParams();
  const { isStaff, loading } = useAuth();
  if (loading) return <Spinner />;
  return <Navigate to={isStaff ? `/admin/properties/${id}` : `/owner/properties/${id}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="homes" element={<Listings />} />
        <Route path="residences/:unitId" element={<ListingDetail />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="settings/notifications" element={<Navigate to="/account?tab=notifications" replace />} />

        <Route element={<RequireAuth />}>
          <Route path="account" element={<Account />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="my-rentals" element={<MyRentals />} />
          <Route path="list" element={<ListWizard />} />
          <Route path="list/:id" element={<ListWizard />} />
          <Route path="my-tenancy" element={<Navigate to="/my-rentals" replace />} />
          <Route path="properties/:id" element={<PropertyRedirect />} />

          <Route path="owner" element={<OwnerLayout />}>
            <Route index element={<Navigate to="properties" replace />} />
            <Route path="properties" element={<MyProperties />} />
            <Route path="properties/new" element={<Navigate to="/list" replace />} />
            <Route path="properties/:id" element={<PropertyManage />} />
          </Route>
        </Route>

        <Route element={<RequireAuth need="staff" />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<ReviewDesk />} />
            <Route path="properties" element={<AdminProperties />} />
            <Route path="properties/:id" element={<PropertyManage admin />} />
            <Route path="rent-requests" element={<RentRequests />} />
            <Route path="tenancies" element={<Tenancies />} />
            <Route path="people" element={<People />} />
            <Route path="people/:id" element={<PersonDetail />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="audit" element={<AuditLog />} />
            <Route element={<RequireAuth need="super" />}>
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<div className="container page"><Empty title="Page not found">The page you are looking for does not exist.</Empty></div>} />
      </Route>
    </Routes>
  );
}
