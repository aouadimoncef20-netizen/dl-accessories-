import { Link } from "react-router-dom";

function MobileMenu({ isOpen, onClose }) {
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
        className={`fixed top-0 right-0 h-full w-80 bg-surface z-50 shadow-xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center p-6 border-b border-outline-variant/20">
          <span className="font-display-lg text-[24px] text-primary">DL Accessories</span>
          <button onClick={onClose} className="text-primary hover:opacity-70">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex flex-col p-6 space-y-2">
          {[
            { label: "Collections", to: "/collections" },
            { label: "Gallery", to: "/gallery" },
            { label: "Contact", to: "/contact" },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.to}
              onClick={onClose}
              className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors py-4 border-b border-outline-variant/10"
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
