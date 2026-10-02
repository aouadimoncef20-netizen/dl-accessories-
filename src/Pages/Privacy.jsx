import SEO from "../Component/SEO";

function Privacy() {
  return (
    <div className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <SEO title="Privacy Policy" description="DL Accessories privacy policy." />
      <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-8">Privacy Policy</h1>
      <div className="prose prose-gray max-w-3xl font-body-md text-secondary space-y-6">
        <p>Last updated: September 2026</p>
        <h2 className="font-headline-sm text-on-surface mt-8">Information We Collect</h2>
        <p>When you place an order or create an account we collect your name, phone number, delivery address and the items you ordered. If you create an account we also store your email address and a protected form of your password. We do not ask for or store card details — every order is paid in cash on delivery.</p>
        <h2 className="font-headline-sm text-on-surface mt-8">How We Use Your Information</h2>
        <p>We use your details to deliver your order, to contact you about it, and to answer you when you get in touch. We do not sell your information to anyone.</p>
        <h2 className="font-headline-sm text-on-surface mt-8">Data Protection</h2>
        <p>Your order details are kept in our order system, which only the shop owner can read, and passwords are stored in a form that cannot be read back. If you would like your details removed, email us and we will delete them.</p>
        <h2 className="font-headline-sm text-on-surface mt-8">Contact</h2>
        <p>For privacy-related inquiries, contact us at <a href="mailto:dl.accessoires@gmail.com" className="text-primary underline">dl.accessoires@gmail.com</a>.</p>
      </div>
    </div>
  );
}

export default Privacy;
