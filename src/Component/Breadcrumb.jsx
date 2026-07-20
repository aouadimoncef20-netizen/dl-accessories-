import { Link } from "react-router-dom";

function Breadcrumb({ items }) {
  return (
    <nav className="mb-12 flex items-center gap-2 font-label-sm text-on-surface-variant editorial-spacing uppercase">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span className="material-symbols-outlined text-[14px]">chevron_right</span>}
          {item.link ? (
            <Link to={item.link} className="hover:text-primary transition-colors">{item.label}</Link>
          ) : (
            <span className="text-on-surface">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export default Breadcrumb;
