import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="bg-surface-container-low w-full py-section-gap px-margin-mobile md:px-margin-desktop">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter max-w-container-max mx-auto">
        {/* Column 1: Brand */}
        <div className="space-y-6 md:col-span-1">
          <div className="font-display-lg-mobile text-display-lg-mobile text-primary">
            DL Accessories
          </div>
          <p className="font-body-md text-body-md text-secondary">
            Crafting the essence of modern elegance. Pieces designed for the muse
            within every woman.
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
            Shop
          </h5>
          <ul className="space-y-4 font-body-md text-secondary">
            <li>
              <Link
                to="/collections"
                className="hover:text-primary transition-colors duration-300"
              >
                New Arrivals
              </Link>
            </li>
            <li>
              <Link
                to="/collections"
                className="hover:text-primary transition-colors duration-300"
              >
                Bestsellers
              </Link>
            </li>
            <li>
              <Link
                to="/collections"
                className="hover:text-primary transition-colors duration-300"
              >
                Watches
              </Link>
            </li>
            <li>
              <Link
                to="/collections"
                className="hover:text-primary transition-colors duration-300"
              >
                Jewelry Sets
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Company */}
        <div className="space-y-6">
          <h5 className="font-label-md text-primary uppercase tracking-widest">
            Company
          </h5>
          <ul className="space-y-4 font-body-md text-secondary">
            <li>
              <Link
                to="/contact"
                className="hover:text-primary transition-colors duration-300"
              >
                Our Story
              </Link>
            </li>
            <li>
              <Link
                to="/contact"
                className="hover:text-primary transition-colors duration-300"
              >
                Contact Us
              </Link>
            </li>
            <li>
              <Link
                to="/privacy"
                className="hover:text-primary transition-colors duration-300"
              >
                Privacy
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 4: Support */}
        <div className="space-y-6">
          <h5 className="font-label-md text-primary uppercase tracking-widest">
            Support
          </h5>
          <ul className="space-y-4 font-body-md text-secondary">
            <li>
              <Link
                to="/contact"
                className="hover:text-primary transition-colors duration-300"
              >
                Contact Us
              </Link>
            </li>
            <li>
              <Link
                to="/privacy"
                className="hover:text-primary transition-colors duration-300"
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link
                to="/terms"
                className="hover:text-primary transition-colors duration-300"
              >
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-container-max mx-auto mt-20 pt-8 border-t border-outline/10 text-center md:text-left">
        <p className="font-body-md text-body-md text-secondary opacity-60">
          &copy; {new Date().getFullYear()} DL Accessories. Crafted for the Modern Muse.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
