import { useState } from "react";

export default function Newsletter() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="relative py-section-gap overflow-hidden">
      <div className="relative z-10 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop text-center">
        <h2 className="font-headline-md text-headline-md mb-6">Join the Collective</h2>
        <p className="font-body-lg text-body-lg text-secondary mb-10 max-w-lg mx-auto">
          Be the first to receive invitations to our private collection launches and seasonal lookbooks.
        </p>
        {submitted ? (
          <div className="inline-flex items-center gap-2 px-8 py-4 bg-primary-container/20 rounded-full">
            <span className="material-symbols-outlined text-primary">check_circle</span>
            <span className="font-label-md text-primary">Subscribed successfully!</span>
          </div>
        ) : (
          <form
            className="flex flex-col md:flex-row gap-4 max-w-md mx-auto"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
          >
            <input
              className="flex-1 bg-white rounded-lg px-8 py-4 border border-[#EFEFEF] focus:outline-none focus:border-primary-container focus:ring-4 focus:ring-primary-container/20 transition-all duration-300"
              placeholder="Email address"
              type="email"
              required
            />
            <button
              className="px-10 py-4 bg-primary-container text-on-background rounded-full font-label-md uppercase tracking-widest hover:shadow-lg hover:shadow-primary/10 active:scale-95 transition-all"
              type="submit"
            >
              Subscribe
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
