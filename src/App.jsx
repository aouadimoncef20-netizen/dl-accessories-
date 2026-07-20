import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./Layouts/MainLayout";
import AuthGuard from "./Component/AuthGuard";
import useAuthStore from "./stores/authStore";
import { supabase } from "./lib/supabase";

// Public pages
import Home from "./Pages/Home";
import Collections from "./Pages/Collections";
import ProductDetails from "./Pages/ProductDetails";
import Cart from "./Pages/Cart";
import Checkout from "./Pages/Checkout";
import OrderConfirmed from "./Pages/OrderConfirmed";
import Gallery from "./Pages/Gallery";
import Contact from "./Pages/Contact";
import Favorites from "./Pages/Favorites";
import SearchResults from "./Pages/SearchResults";
import Privacy from "./Pages/Privacy";
import Terms from "./Pages/Terms";
import ShippingPage from "./Pages/Shipping";

// Auth pages (no layout)
import Login from "./Pages/Login";
import Register from "./Pages/Register";
import ForgotPassword from "./Pages/ForgotPassword";

// Protected pages
import Account from "./Pages/Account";
import MyOrders from "./Pages/MyOrders";

// Admin
import AdminDashboard from "./Pages/AdminDashboard";

function App() {
  const { initialize, loading } = useAuthStore();

  useEffect(() => {
    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      useAuthStore.setState({ user: session?.user || null, loading: false });
    });

    return () => subscription?.unsubscribe();
  }, [initialize]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <span className="font-display-lg text-[28px] text-primary">DL Accessories</span>
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Auth pages (standalone, no navbar/footer) */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Main layout pages */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-confirmed" element={<OrderConfirmed />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/shipping" element={<ShippingPage />} />

        {/* Protected routes */}
        <Route path="/account" element={<AuthGuard><Account /></AuthGuard>} />
        <Route path="/my-orders" element={<AuthGuard><MyOrders /></AuthGuard>} />

        {/* Category redirects */}
        <Route path="/watches" element={<Navigate to="/collections?cat=Watches" replace />} />
        <Route path="/jewelry" element={<Navigate to="/collections?cat=Jewelry" replace />} />
        <Route path="/lashes" element={<Navigate to="/collections?cat=Lashes" replace />} />
      </Route>

      {/* Admin (separate layout) */}
      <Route path="/admin/*" element={<AuthGuard requireAdmin><AdminDashboard /></AuthGuard>} />
    </Routes>
  );
}

export default App;
