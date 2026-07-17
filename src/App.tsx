import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import Index from "./pages/Index.tsx";
import ProductPage from "./pages/product/page.tsx";
import CheckoutPage from "./pages/checkout/page.tsx";
import ThankYouPage from "./pages/thank-you/page.tsx";
import AdminLoginPage from "./pages/admin/login.tsx";
import AdminDashboardPage from "./pages/admin/dashboard.tsx";
import AdminUnauthorizedPage from "./pages/admin/unauthorized.tsx";
import AccessPurchasePage from "./pages/access-purchase/page.tsx";
import RefPage from "./pages/ref/page.tsx";
import NotFound from "./pages/NotFound.tsx";
import { CartProvider } from "./hooks/use-cart.tsx";
import { WishlistProvider } from "./hooks/use-wishlist.tsx";
import { WishlistDrawer } from "./components/wishlist-drawer.tsx";
import { ErrorBoundary } from "./components/error-boundary.tsx";
import { SocialProofNotifications } from "./components/social-proof-notifications.tsx";

export default function App() {
  return (
    <ErrorBoundary context="the application">
      <DefaultProviders>
        <BrowserRouter>
          <WishlistProvider>
            <CartProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/product/:id" element={
                  <ErrorBoundary context="the product page">
                    <ProductPage />
                  </ErrorBoundary>
                } />
                <Route path="/checkout" element={
                  <ErrorBoundary context="checkout">
                    <CheckoutPage />
                  </ErrorBoundary>
                } />
                <Route path="/thank-you/:token" element={
                  <ErrorBoundary context="the thank-you page">
                    <ThankYouPage />
                  </ErrorBoundary>
                } />
                <Route path="/access-purchase" element={<AccessPurchasePage />} />
                <Route path="/ref/:code" element={<RefPage />} />
                <Route path="/admin" element={<AdminLoginPage />} />
                <Route path="/admin/dashboard" element={
                  <ErrorBoundary context="the admin dashboard">
                    <AdminDashboardPage />
                  </ErrorBoundary>
                } />
                <Route path="/admin/unauthorized" element={<AdminUnauthorizedPage />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <WishlistDrawer />
              <SocialProofNotifications />
            </CartProvider>
          </WishlistProvider>
        </BrowserRouter>
      </DefaultProviders>
    </ErrorBoundary>
  );
}
