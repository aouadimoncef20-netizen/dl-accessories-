import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import useProductStore from "../stores/productStore";

function AdminDashboard() {
  const { signOut } = useAuthStore();
  const { fetchAllOrders } = useProductStore();
  const [tab, setTab] = useState("overview");
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchAllOrders().then(setOrders);
  }, [fetchAllOrders]);

  const tabs = [
    { key: "overview", label: "Overview", icon: "dashboard" },
    { key: "products", label: "Products", icon: "inventory_2" },
    { key: "orders", label: "Orders", icon: "receipt_long" },
    { key: "users", label: "Users", icon: "people" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-surface border-r border-outline-variant/20 p-6 fixed h-full">
        <Link to="/" className="font-display-lg text-[22px] text-primary mb-12">DL Admin</Link>
        <nav className="flex flex-col gap-1 flex-1">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-body-md text-left transition-colors ${
                tab === t.key ? "bg-primary-container/30 text-primary" : "text-secondary hover:bg-surface-container"
              }`}>
              <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="space-y-2 pt-4 border-t border-outline-variant/20">
          <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-xl font-body-md text-secondary hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-[20px]">storefront</span>
            View Store
          </Link>
          <button onClick={signOut}
            className="flex items-center gap-3 px-4 py-3 rounded-xl font-body-md text-secondary hover:bg-surface-container transition-colors w-full">
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 w-full z-50 bg-surface border-b border-outline-variant/20 px-margin-mobile py-4 flex items-center justify-between">
        <span className="font-display-lg text-[20px] text-primary">DL Admin</span>
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-2 rounded-full text-xs uppercase tracking-widest whitespace-nowrap ${
                tab === t.key ? "bg-primary text-white" : "bg-surface-container text-secondary"
              }`}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 md:ml-64 p-6 md:p-10 pt-20 md:pt-10">
        {tab === "overview" && (
          <div>
            <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-8">Dashboard</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Orders", value: orders.length, icon: "receipt_long", color: "text-primary" },
                { label: "Pending", value: orders.filter((o) => o.status === "pending").length, icon: "pending", color: "text-amber-600" },
                { label: "Shipped", value: orders.filter((o) => o.status === "shipped").length, icon: "local_shipping", color: "text-blue-600" },
                { label: "Revenue", value: "$" + orders.reduce((s, o) => s + (o.total || 0), 0).toFixed(2), icon: "payments", color: "text-green-600" },
              ].map((s) => (
                <div key={s.label} className="bg-surface rounded-2xl p-6 soft-glow">
                  <span className={`material-symbols-outlined text-3xl ${s.color} mb-3`}>{s.icon}</span>
                  <p className="font-display-lg text-[28px] text-on-surface">{s.value}</p>
                  <p className="font-label-sm text-secondary uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "products" && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg">Products</h1>
              <button className="px-6 py-3 bg-primary text-on-primary rounded-full font-label-sm uppercase tracking-widest hover:opacity-90">
                + Add Product
              </button>
            </div>
            <div className="bg-surface rounded-2xl soft-glow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-outline-variant/20 text-left">
                      <th className="p-4 font-label-sm text-secondary uppercase tracking-widest">Product</th>
                      <th className="p-4 font-label-sm text-secondary uppercase tracking-widest">Category</th>
                      <th className="p-4 font-label-sm text-secondary uppercase tracking-widest">Price</th>
                      <th className="p-4 font-label-sm text-secondary uppercase tracking-widest">Stock</th>
                      <th className="p-4 font-label-sm text-secondary uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-secondary">
                        Products table will populate from Supabase. Visit the Supabase dashboard to add your first product.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div>
            <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-8">Orders</h1>
            {orders.length === 0 ? (
              <div className="bg-surface rounded-2xl p-12 text-center soft-glow">
                <span className="material-symbols-outlined text-4xl text-outline mb-4">receipt_long</span>
                <p className="font-headline-sm text-on-surface-variant">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="bg-surface rounded-2xl p-6 soft-glow">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div>
                        <p className="font-label-sm text-secondary uppercase mb-1">#{order.id.slice(0, 8)}</p>
                        <p className="font-body-md text-on-surface">{order.customer_name}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-xs uppercase font-label-sm ${
                          order.status === "delivered" ? "bg-green-100 text-green-800" :
                          order.status === "shipped" ? "bg-blue-100 text-blue-800" :
                          "bg-primary-container/30 text-primary"
                        }`}>{order.status}</span>
                        <span className="font-headline-sm text-primary">${order.total?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "users" && (
          <div>
            <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-8">Users</h1>
            <div className="bg-surface rounded-2xl p-12 text-center soft-glow">
              <span className="material-symbols-outlined text-4xl text-outline mb-4">people</span>
              <p className="font-headline-sm text-on-surface-variant">User management available in the Supabase dashboard.</p>
              <p className="font-body-md text-secondary mt-2">Visit Authentication → Users in your Supabase project.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
