import { Link } from "react-router-dom";

function Terms() {
  return (
    <div className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-8">Terms of Service</h1>
      <div className="prose prose-gray max-w-3xl font-body-md text-secondary space-y-6">
        <p>Last updated: January 2024</p>
        <h2 className="font-headline-sm text-on-surface mt-8">General</h2>
        <p>By using DL Accessories, you agree to these terms. If you do not agree, please do not use our services.</p>
        <h2 className="font-headline-sm text-on-surface mt-8">Products & Pricing</h2>
        <p>All prices are listed in USD. We reserve the right to modify prices at any time. Product availability is subject to change.</p>
        <h2 className="font-headline-sm text-on-surface mt-8">Intellectual Property</h2>
        <p>All content on this website, including images, text, and designs, is the property of DL Accessories and may not be reproduced without permission.</p>
        <h2 className="font-headline-sm text-on-surface mt-8">Contact</h2>
        <p>For questions about these terms, contact us at <Link to="/contact" className="text-primary underline">concierge@dlaccessories.com</Link>.</p>
      </div>
    </div>
  );
}

export default Terms;
