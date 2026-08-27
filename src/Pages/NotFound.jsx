import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <span className="font-display-lg text-[120px] md:text-[160px] text-primary/10 leading-none block select-none">
          404
        </span>
        <h1 className="font-headline-sm text-headline-md text-on-surface -mt-4 mb-4">
          Page Not Found
        </h1>
        <p className="font-body-md text-on-surface-variant mb-10">
          The page you're looking for doesn't exist or has been moved. Let's get
          you back to shopping.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="px-8 py-4 bg-primary-container text-on-primary-container rounded-full font-label-md uppercase tracking-widest hover:opacity-90 transition-opacity text-center"
          >
            Back to Home
          </Link>
          <Link
            to="/collections"
            className="px-8 py-4 border border-outline-variant text-secondary rounded-full font-label-md uppercase tracking-widest hover:bg-surface-container-low transition-colors text-center"
          >
            Browse Collections
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
