import { Link } from "react-router-dom";

function AnnouncementBar() {
  return (
    <div className="bg-primary text-white text-center py-2.5 font-label-sm text-label-sm tracking-wider px-4">
      <p>
        Complimentary shipping on all orders over $75 &nbsp;|&nbsp;
        <Link to="/collections" className="underline underline-offset-2 hover:opacity-80 transition-opacity">
          Shop New Arrivals
        </Link>
      </p>
    </div>
  );
}

export default AnnouncementBar;
