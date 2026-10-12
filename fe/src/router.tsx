import type { ComponentType } from "react";
import { createBrowserRouter } from "react-router";
import {
  Bell,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Flag,
  Heart,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
  ScrollText,
  Settings,
  ShieldCheck,
  Store,
  Tags,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import App from "./App";
import { RequireRole } from "./components/auth/RequireRole";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { RouteFallback } from "./components/layout/RouteFallback";
import { PublicLayout } from "./components/layout/PublicLayout";
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from "./pages/auth/AuthPages";
import { NotFoundPage } from "./pages/NotFoundPage";
import { OwnerLayout } from "./pages/owner/OwnerLayout";
import { RestaurantDetailPage } from "./pages/public/RestaurantDetailPage";
import { RestaurantsPage } from "./pages/public/RestaurantsPage";
import { SearchPage } from "./pages/public/SearchPage";

/**
 * Dashboard pages are loaded on demand, so a diner opening the landing page
 * never downloads the owner, reviewer or admin screens.
 */
function page<M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M & string) {
  return { lazy: async () => ({ Component: (await load())[name] as ComponentType }) };
}


const shared = () => import("./pages/shared/SharedPages");
const consumer = () => import("./pages/consumer/ConsumerPages");
const owner = () => import("./pages/owner/OwnerPages");
const ownerManage = () => import("./pages/owner/OwnerManagePages");
const reviewer = () => import("./pages/reviewer/ReviewerPages");
const admin = () => import("./pages/admin/AdminPages");
const adminManage = () => import("./pages/admin/AdminManagePages");

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <App /> },
      { path: "/restaurants", element: <RestaurantsPage /> },
      { path: "/restaurants/:id", element: <RestaurantDetailPage /> },
      { path: "/search", element: <SearchPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  {
    path: "/dashboard",
    hydrateFallbackElement: <RouteFallback />,
    element: (
      <RequireRole roles={["CONSUMER"]}>
        <DashboardLayout
          title="Your dashboard"
          base="/dashboard"
          nav={[
            { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
            { to: "/dashboard/favorites", label: "Favourites", icon: Heart },
            { to: "/dashboard/reviews", label: "My reviews", icon: MessageSquareText },
            { to: "/dashboard/recent", label: "Recently viewed", icon: Clock },
            { to: "/dashboard/notifications", label: "Notifications", icon: Bell },
            { to: "/dashboard/settings", label: "Account settings", icon: Settings },
          ]}
        />
      </RequireRole>
    ),
    children: [
      { index: true, ...page(consumer, "ConsumerOverviewPage") },
      { path: "favorites", ...page(consumer, "FavoritesPage") },
      { path: "reviews", ...page(consumer, "MyReviewsPage") },
      { path: "recent", ...page(consumer, "RecentlyViewedPage") },
      { path: "notifications", ...page(shared, "NotificationsPage") },
      { path: "settings", ...page(shared, "SettingsPage") },
    ],
  },
  {
    path: "/restaurant-dashboard",
    hydrateFallbackElement: <RouteFallback />,
    element: (
      <RequireRole roles={["RESTAURANT_OWNER"]}>
        <OwnerLayout />
      </RequireRole>
    ),
    children: [
      { index: true, ...page(owner, "OwnerOverviewPage") },
      { path: "profile", ...page(owner, "OwnerProfilePage") },
      { path: "menu", ...page(ownerManage, "OwnerMenuPage") },
      { path: "reviews", ...page(owner, "OwnerReviewsPage") },
      { path: "hygiene", ...page(owner, "OwnerHygienePage") },
      { path: "delivery", ...page(ownerManage, "OwnerDeliveryPage") },
      { path: "advertising", ...page(ownerManage, "OwnerAdvertisingPage") },
      { path: "notifications", ...page(shared, "NotificationsPage") },
      { path: "settings", ...page(shared, "SettingsPage") },
    ],
  },
  {
    path: "/reviewer",
    hydrateFallbackElement: <RouteFallback />,
    element: (
      <RequireRole roles={["REVIEWER"]}>
        <DashboardLayout
          title="Reviewer dashboard"
          base="/reviewer"
          nav={[
            { to: "/reviewer", label: "Overview", icon: LayoutDashboard, end: true },
            { to: "/reviewer/assignments", label: "Assignments", icon: ClipboardList },
            { to: "/reviewer/audits", label: "Hygiene audits", icon: ClipboardCheck },
            { to: "/reviewer/moderation", label: "Review moderation", icon: MessageSquareText },
            { to: "/reviewer/notifications", label: "Notifications", icon: Bell },
            { to: "/reviewer/settings", label: "Account settings", icon: Settings },
          ]}
        />
      </RequireRole>
    ),
    children: [
      { index: true, ...page(reviewer, "ReviewerOverviewPage") },
      { path: "assignments", ...page(reviewer, "ReviewerAssignmentsPage") },
      { path: "audits", ...page(reviewer, "ReviewerAuditsPage") },
      { path: "audits/new", ...page(reviewer, "AuditEditorPage") },
      { path: "audits/:id", ...page(reviewer, "AuditEditorPage") },
      { path: "moderation", ...page(reviewer, "ReviewerModerationPage") },
      { path: "notifications", ...page(shared, "NotificationsPage") },
      { path: "settings", ...page(shared, "SettingsPage") },
    ],
  },
  {
    path: "/admin",
    hydrateFallbackElement: <RouteFallback />,
    element: (
      <RequireRole roles={["ADMIN"]}>
        <DashboardLayout
          title="Admin"
          base="/admin"
          nav={[
            { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
            { to: "/admin/users", label: "Users", icon: Users },
            { to: "/admin/restaurants", label: "Restaurants", icon: Store },
            { to: "/admin/reviews", label: "Reviews", icon: MessageSquareText },
            { to: "/admin/audits", label: "Hygiene audits", icon: ShieldCheck },
            { to: "/admin/reports", label: "Reports", icon: Flag },
            { to: "/admin/delivery-providers", label: "Delivery providers", icon: Truck },
            { to: "/admin/delivery-pricing", label: "Delivery pricing", icon: Wallet },
            { to: "/admin/advertisements", label: "Advertisements", icon: Megaphone },
            { to: "/admin/categories", label: "Categories", icon: Tags },
            { to: "/admin/notifications", label: "Notifications", icon: Bell },
            { to: "/admin/audit-logs", label: "Audit logs", icon: ScrollText },
            { to: "/admin/settings", label: "Account settings", icon: Settings },
          ]}
        />
      </RequireRole>
    ),
    children: [
      { index: true, ...page(admin, "AdminDashboardPage") },
      { path: "users", ...page(admin, "AdminUsersPage") },
      { path: "restaurants", ...page(admin, "AdminRestaurantsPage") },
      { path: "reviews", ...page(reviewer, "AdminModerationPage") },
      { path: "audits", ...page(admin, "AdminAuditsPage") },
      { path: "reports", ...page(adminManage, "AdminReportsPage") },
      { path: "delivery-providers", ...page(adminManage, "AdminProvidersPage") },
      { path: "delivery-pricing", ...page(adminManage, "AdminPricingPage") },
      { path: "advertisements", ...page(adminManage, "AdminAdsPage") },
      { path: "categories", ...page(adminManage, "AdminCategoriesPage") },
      { path: "notifications", ...page(adminManage, "AdminNotificationsPage") },
      { path: "audit-logs", ...page(adminManage, "AdminAuditLogsPage") },
      { path: "settings", ...page(shared, "SettingsPage") },
    ],
  },
]);
