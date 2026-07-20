export default function Newsletter() {
  return (
    <section className="relative py-section-gap overflow-hidden">
      <div className="relative z-10 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop text-center">
        <h2 className="font-headline-md text-headline-md mb-6">Join the Collective</h2>
        <p className="font-body-lg text-body-lg text-secondary mb-10 max-w-lg mx-auto">
          Be the first to receive invitations to our private collection launches and seasonal lookbooks.
        </p>
        <form
          className="flex flex-col md:flex-row gap-4 max-w-md mx-auto"
          onSubmit={(e) => {
            e.preventDefault();
            alert('Subscribed successfully!');
          }}
        >
          <input
            className="flex-1 bg-white border border-outline-variant/30 rounded-full px-8 py-4 focus:outline-none focus:ring-2 focus:ring-primary-container"
            placeholder="Email address"
            type="email"
          />
          <button
            className="px-10 py-4 bg-primary text-white rounded-full font-label-md uppercase tracking-widest hover:opacity-90 transition-opacity"
            type="submit"
          >
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
}
