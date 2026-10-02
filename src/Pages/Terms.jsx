import SEO from "../Component/SEO";

function Terms() {
  return (
    <div className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <SEO title="Terms of Service" description="DL Accessories terms and conditions." />
      <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-8">Terms of Service</h1>
      <div className="prose prose-gray max-w-3xl font-body-md text-secondary space-y-6">
        <p>Last updated: September 2026</p>
        <h2 className="font-headline-sm text-on-surface mt-8">General</h2>
        <p>By using DL Accessories, you agree to these terms. If you do not agree, please do not use our services.</p>
        <h2 className="font-headline-sm text-on-surface mt-8">Products & Pricing</h2>
        <p>All prices are shown in Algerian dinars (DZD). The price shown on a product is the price you pay, plus any delivery charge set out at checkout. We reserve the right to change prices at any time, and availability can change.</p>
        <h2 className="font-headline-sm text-on-surface mt-8">Orders & Payment</h2>
        <p>Orders are paid in cash on delivery. You will be contacted on the phone number you gave at checkout to confirm the order and the delivery address before it is dispatched.</p>
        <h2 className="font-headline-sm text-on-surface mt-8">Intellectual Property</h2>
        <p>All content on this website, including images, text, and designs, is the property of DL Accessories and may not be reproduced without permission.</p>
        <h2 className="font-headline-sm text-on-surface mt-8">Contact</h2>
        <p>For questions about these terms, contact us at <a href="mailto:dl.accessoires@gmail.com" className="text-primary underline">dl.accessoires@gmail.com</a>.</p>
      </div>
    </div>
  );
}

export default Terms;
