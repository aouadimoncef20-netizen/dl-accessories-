import { Link } from "react-router-dom";

function Privacy() {
  return (
    <div className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-8">Privacy Policy</h1>
      <div className="prose prose-gray max-w-3xl font-body-md text-secondary space-y-6">
        <p>Last updated: January 2024</p>
        <h2 className="font-headline-sm text-on-surface mt-8">Information We Collect</h2>
        <p>We collect information you provide directly to us, including your name, email address, phone number, shipping address, and payment information when you make a purchase or contact us.</p>
        <h2 className="font-headline-sm text-on-surface mt-8">How We Use Your Information</h2>
        <p>We use your information to process orders, communicate with you about your purchases, send marketing communications (with your consent), and improve our services.</p>
        <h2 className="font-headline-sm text-on-surface mt-8">Data Protection</h2>
        <p>We implement industry-standard security measures to protect your personal information. All payment transactions are encrypted using SSL technology.</p>
        <h2 className="font-headline-sm text-on-surface mt-8">Contact</h2>
        <p>For privacy-related inquiries, contact us at <Link to="/contact" className="text-primary underline">concierge@dlaccessories.com</Link>.</p>
      </div>
    </div>
  );
}

export default Privacy;
