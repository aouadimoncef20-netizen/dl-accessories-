import { Link } from "react-router-dom";
import useTranslation from "../i18n/useTranslation";

function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-surface-container-low w-full py-section-gap px-margin-mobile md:px-margin-desktop">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter max-w-container-max mx-auto">
        {/* Column 1: Brand */}
        <div className="space-y-6 md:col-span-1">
          <div className="font-display-lg-mobile text-display-lg-mobile text-primary">
            DL Accessories
          </div>
          <p className="font-body-md text-body-md text-secondary">
            {t("footer_desc")}
          </p>
          <div className="flex gap-4">
            <button
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all duration-300"
              aria-label="Website"
            >
              <span className="material-symbols-outlined text-sm">public</span>
            </button>
            <button
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all duration-300"
              aria-label="Share"
            >
              <span className="material-symbols-outlined text-sm">share</span>
            </button>
          </div>
        </div>

        {/* Column 2: Shop */}
        <div className="space-y-6">
          <h5 className="font-label-md text-primary uppercase tracking-widest">
            {t("footer_shop")}
          </h5>
          <ul className="space-y-4 font-body-md text-secondary">
            <li>
              <Link to="/collections" className="hover:text-primary transition-colors duration-300">
                {t("footer_new_arrivals")}
              </Link>
            </li>
            <li>
              <Link to="/collections" className="hover:text-primary transition-colors duration-300">
                {t("footer_bestsellers")}
              </Link>
            </li>
            <li>
              <Link to="/collections" className="hover:text-primary transition-colors duration-300">
                {t("footer_watches")}
              </Link>
            </li>
            <li>
              <Link to="/collections" className="hover:text-primary transition-colors duration-300">
                {t("footer_jewelry_sets")}
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Company */}
        <div className="space-y-6">
          <h5 className="font-label-md text-primary uppercase tracking-widest">
            {t("footer_company")}
          </h5>
          <ul className="space-y-4 font-body-md text-secondary">
            <li>
              <Link to="/contact" className="hover:text-primary transition-colors duration-300">
                {t("footer_our_story")}
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-primary transition-colors duration-300">
                {t("footer_contact_us")}
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:text-primary transition-colors duration-300">
                {t("footer_privacy")}
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 4: Support */}
        <div className="space-y-6">
          <h5 className="font-label-md text-primary uppercase tracking-widest">
            {t("footer_support")}
          </h5>
          <ul className="space-y-4 font-body-md text-secondary">
            <li>
              <Link to="/contact" className="hover:text-primary transition-colors duration-300">
                {t("footer_contact_us")}
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:text-primary transition-colors duration-300">
                {t("footer_privacy_policy")}
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-primary transition-colors duration-300">
                {t("footer_terms")}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-container-max mx-auto mt-20 pt-8 border-t border-outline/10 text-center md:text-left">
        <p className="font-body-md text-body-md text-secondary opacity-60">
          {t("footer_copyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}

export default Footer;
