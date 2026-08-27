import { useState } from "react";
import PageTransition from "../Component/PageTransition";
import SEO from "../Component/SEO";
import ScrollReveal from "../Component/ScrollReveal";

function Contact() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <PageTransition>
    <main className="pt-32">
      <SEO title="Contact Us" description="Get in touch with DL Accessories — we'd love to hear from you." />
      {/* Hero Section */}
      <section className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto mb-section-gap">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter items-center">
          <div className="space-y-6">
            <ScrollReveal>
              <span className="font-label-md text-primary uppercase tracking-widest block">
                Connect With Us
              </span>
              <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-background">
                We'd love to hear from you.
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={0.15}>
              <p className="font-body-lg text-on-surface-variant max-w-lg">
                Whether you have a question about our latest collection, need
                assistance with an order, or just want to share your thoughts,
                our team is here to help.
              </p>
            </ScrollReveal>
          </div>
          <ScrollReveal direction="right" distance={40} delay={0.1}>
            <div className="relative group h-[400px] md:h-[500px] rounded-xl overflow-hidden soft-glow-shadow">
              <img
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                alt="Contact"
                loading="lazy"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBqzVclMmTiHdRUaZCJgKa5_MmpFPg9yiHNqpUpr7ANB06lrU9IKk_ZDHsba9pUOPBvzU9xdiZKP6Wopu5tLbezyrYD_j0UXbgnGyrlRJr4ni34ottixOYiglZu-_wtbm_fj40MEqB6H99VsKjD7iXQPeX_9IiGyQDsJiArIhMlnWIYbFtumloROzHWAzi74_uIIK0MuFSv0I2jAWNuvAIY37iXPJJ_EnfG2Y_JbgI3gaaLdL584Dja"
              />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Form & Details */}
      <section className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto mb-section-gap">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Contact Info */}
          <ScrollReveal direction="left" distance={30}>
            <div className="lg:col-span-4 space-y-12">
              <div className="space-y-4">
                <h3 className="font-headline-sm text-on-background">Our Studio</h3>
                <p className="font-body-md text-on-surface-variant">
                  Reghaia, Algiers,
                  <br />
                  Algeria
                </p>
              </div>
              <div className="space-y-4">
                <h3 className="font-headline-sm text-on-background">
                  Contact Details
                </h3>
                <div className="space-y-2">
                  <p className="font-body-md text-on-surface-variant flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">
                      mail
                    </span>
                    dl.accessoires@gmail.com
                  </p>
                  <p className="font-body-md text-on-surface-variant flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">
                      call
                    </span>
                    +213 555 00 00 00
                  </p>
                  <p className="font-body-md text-on-surface-variant flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">
                      schedule
                    </span>
                    Sun – Thu: 9:00 AM – 6:00 PM
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-headline-sm text-on-background">
                  Follow Our Journey
                </h3>
                <div className="flex gap-4">
                  <a
                    href="https://www.instagram.com/dl.accessoires.reghaia/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container hover:bg-primary-container transition-colors duration-300"
                    aria-label="Instagram"
                  >
                    <span className="material-symbols-outlined">
                      photo_camera
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Contact Form */}
          <ScrollReveal direction="right" distance={30} delay={0.1}>
          <div className="lg:col-span-8 bg-surface-container-lowest rounded-3xl p-8 md:p-12 soft-glow-shadow">
            <form className="space-y-8" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="font-label-md text-on-surface-variant">
                    Full Name
                  </label>
                  <input
                    className="w-full bg-white border border-outline-variant rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-container focus:border-primary outline-none transition-all duration-300"
                    placeholder="Your name"
                    type="text"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-label-md text-on-surface-variant">
                    Email Address
                  </label>
                  <input
                    className="w-full bg-white border border-outline-variant rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-container focus:border-primary outline-none transition-all duration-300"
                    placeholder="you@example.com"
                    type="email"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="font-label-md text-on-surface-variant">
                  Inquiry Type
                </label>
                <select className="w-full bg-white border border-outline-variant rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-container focus:border-primary outline-none appearance-none transition-all duration-300">
                  <option>Product Information</option>
                  <option>Order Tracking</option>
                  <option>Returns & Exchanges</option>
                  <option>Wholesale Inquiry</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="font-label-md text-on-surface-variant">
                  Message
                </label>
                <textarea
                  className="w-full bg-white border border-outline-variant rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-container focus:border-primary outline-none transition-all duration-300 resize-none"
                  placeholder="How can we assist you today?"
                  rows="5"
                  required
                />
              </div>
              <button
                className={`w-full md:w-auto px-12 py-4 rounded-full font-label-md hover:shadow-lg hover:shadow-primary/20 active:scale-95 transition-all duration-300 ${
                  sent
                    ? "bg-green-100 text-green-800"
                    : "bg-primary-container text-on-primary-fixed-variant"
                }`}
                type="submit"
              >
                {sent ? "Thank You! Message Sent" : "Send Inquiry"}
              </button>
            </form>
          </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
    </PageTransition>
  );
}

export default Contact;
