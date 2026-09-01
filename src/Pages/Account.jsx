import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import useWishlistStore from "../stores/wishlistStore";

function Account() {
  const { user, profile, signOut, isAdmin, makeAdmin } = useAuthStore();
  const { items: wishlist } = useWishlistStore();
  const navigate = useNavigate();

  const handleMakeAdmin = async () => {
    await makeAdmin();
    navigate("/admin");
  };

  return (
    <div className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-12">My Account</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Sidebar */}
        <div className="lg:col-span-3 space-y-2">
          {[
            { label: "Dashboard", icon: "dashboard", active: true },
            { label: "My Orders", icon: "receipt_long", to: "/my-orders" },
            { label: "Wishlist", icon: "favorite", to: "/favorites" },
            { label: "Profile Settings", icon: "settings" },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.to || "#"}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-body-md transition-colors ${
                item.active ? "bg-primary-container/30 text-primary" : "text-secondary hover:bg-surface-container"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </Link>
          ))}
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-4 py-3 rounded-xl font-body-md text-secondary hover:bg-surface-container transition-colors w-full text-left mt-8"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Sign Out
          </button>

          {!isAdmin && (
            <button
              onClick={handleMakeAdmin}
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-body-md text-primary bg-primary-container/30 hover:bg-primary-container/50 transition-colors w-full text-left mt-2"
            >
              <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
              Grant Admin Access
            </button>
          )}
        </div>

        {/* Main */}
        <div className="lg:col-span-9">
          <div className="bg-surface rounded-3xl p-8 md:p-10 soft-glow">
            <h2 className="font-headline-sm text-headline-sm mb-6">Dashboard</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              {[
                { label: "Orders", value: "0", icon: "shopping_bag" },
                { label: "Wishlist Items", value: String(wishlist.length), icon: "favorite" },
                { label: "Member Since", value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—", icon: "calendar_today" },
              ].map((stat) => (
                <div key={stat.label} className="bg-surface-container-low rounded-xl p-6 text-center">
                  <span className="material-symbols-outlined text-primary text-3xl mb-2">{stat.icon}</span>
                  <p className="font-display-lg text-[24px] text-primary">{stat.value}</p>
                  <p className="font-label-sm text-secondary uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>

            <h3 className="font-headline-sm text-headline-sm mb-4">Profile Information</h3>
            <div className="bg-surface-container-low rounded-xl p-6 space-y-3 font-body-md">
              <div className="flex justify-between border-b border-outline-variant/20 pb-3">
                <span className="text-secondary">Name</span>
                <span className="text-on-surface">{profile?.full_name || user?.user_metadata?.full_name || "—"}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/20 pb-3">
                <span className="text-secondary">Email</span>
                <span className="text-on-surface">{user?.email || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Account ID</span>
                <span className="text-on-surface text-sm">{user?.id?.slice(0, 16)}...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Account;
