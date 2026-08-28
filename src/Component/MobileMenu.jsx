import { Link } from "react-router-dom";
import useTranslation from "../i18n/useTranslation";

function MobileMenu({ isOpen, onClose }) {
  const { t, isRtl } = useTranslation();

  const menuItems = [
    { label: t("nav_collections"), to: "/collections" },
    { label: t("nav_gallery"), to: "/gallery" },
    { label: t("nav_contact"), to: "/contact" },
  ];

  // Use inline styles for positioning to guarantee RTL works
  const panelStyle = {
    top: 0,
    height: "100%",
    width: "320px",
    maxWidth: "85vw",
    position: "fixed",
    zIndex: 50,
    [isRtl ? "left" : "right"]: 0,
    transform: isOpen
      ? "translateX(0)"
      : isRtl
        ? "translateX(-100%)"
        : "translateX(100%)",
    transition: "transform 0.3s ease",
    backgroundColor: "hsl(var(--surface))",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  };

  return (
    <>
      {/* Overlay — only interactive when open */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.3)",
          zIndex: 40,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Slide-out panel */}
      <div style={panelStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "24px",
            borderBottom: "1px solid hsl(var(--outline-variant))",
          }}
        >
          <span style={{ fontFamily: "Playfair Display, serif", fontSize: "20px", color: "hsl(var(--primary))" }}>
            DL Accessories
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "hsl(var(--primary))",
              padding: "8px",
            }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: "24px" }}>
          {menuItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              style={{
                fontFamily: "Plus Jakarta Sans, sans-serif",
                fontSize: "14px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "hsl(var(--on-surface-variant))",
                textDecoration: "none",
                padding: "16px 0",
                borderBottom: "1px solid hsl(var(--outline-variant))",
                textAlign: isRtl ? "right" : "left",
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

export default MobileMenu;
