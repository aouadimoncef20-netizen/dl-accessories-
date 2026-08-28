import { Link } from "react-router-dom";
import useTranslation from "../i18n/useTranslation";

function MobileMenu({ isOpen, onClose }) {
  const { t, isRtl } = useTranslation();

  const menuItems = [
    { label: t("nav_collections"), to: "/collections" },
    { label: t("nav_gallery"), to: "/gallery" },
    { label: t("nav_contact"), to: "/contact" },
  ];

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      {/* Slide-out menu */}
      <div
        className={`fixed top-0 ${isRtl ? "left-0" : "right-0"} h-full w-80 bg-surface z-50 shadow-xl transition-transform duration-300 ${
          isOpen
            ? "translate-x-0"
            : isRtl
              ? "-translate-x-full"
              : "translate-x-full"
        }`}
      >
        <div className={`flex justify-between items-center p-6 border-b border-outline-variant/20 ${isRtl ? "flex-row-reverse" : ""}`}>
          <span className="font-display-lg text-[24px] text-primary">DL Accessories</span>
          <button onClick={onClose} className="text-primary hover:opacity-70">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex flex-col p-6 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={`font-label-md text-label-md uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors py-4 border-b border-outline-variant/10 ${isRtl ? "text-right" : "text-left"}`}
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
