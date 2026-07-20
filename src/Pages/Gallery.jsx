import { useState } from "react";
import { Link } from "react-router-dom";
import PageTransition from "../Component/PageTransition";

const galleryData = [
  {
    title: "The Morning Glow",
    desc: "Capturing the soft transition of light at dawn, where golden accessories meet delicate skin.",
    category: "Collection 01",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC0fdVuaWHrMYmk9n0WEFAviDMkQNrKUBWgqh28DdGj_7NovCkd4wuIRGYyULhO1fee3AoaC-GOQw1H7p1sfhBN_dBfvCUW6NkpGXI8gtmL9onBbYPPcVmm5XH2UV_cGc-KCSVKAqOtWx2x5VBCQ3BvR9wdABPl1UdFzqlAsvhFjp7rUuYYF6pFY631OoSaP-yzN6hKAkLwr0AbXtd0uC_dnDd4KBTyXoSz6fIrn66WOHIgpmpN7_tB",
  },
  {
    title: "Precision",
    desc: "A study in horological excellence. Minimalist design meets Swiss-inspired engineering.",
    category: "Watches",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCn31R8u_ygpvxbF9yi0c37Gt1xeUMZ1JyXhLQZHcsD3a81A6Zl0LH9KZykV-FYRkRTq7HVy3bjxImdzRce8dPubbV74g-CAK_9-bqctS8D3cEfHdoTx-4Yrg7r9bj55JJ7KVGfl0FpWXfgcBiQiUYKBKgp55H3PKz48ga5KgnrAv5-yEjpQaDn4K0_8ne440Fdn61eJ2jEwELL2pudel1Q_vpXwsLkV6E6FIdSyyJfIzkqVv4KNc7c",
  },
  {
    title: "Vanity Details",
    desc: "The quiet moments of preparation. A curated space for reflection and adornment.",
    category: "Lifestyle",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBHQ_8SKZFP_-1axnUzjZ9oyTS8RGXSZLeNYNvX_Syb80Jom7vHzXBrUNrBlu40Tg91MpkHipboQCGKC6nGpdHK-NRur7jBaJEhDs2J7MP451J5rIlNOKotZiw7wLkeWpRQ1K_rUsf09vtrDIJxHlUgnk873kbWLgCXwtEqPgvywGMPeGOipEzTwejF9A_UAmewnDt8669JNeBL6v4xta0qJJm8M7fDINd7iFmLsRXRD47L-uaGwfNd",
  },
  {
    title: "Silk & Gold",
    desc: "A tactile exploration of premium materials. Silk and 18k gold in perfect harmony.",
    category: "Editorial",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAVr3H3-xtjVcouO-I3J6e54gD2P4UUnDOz2-jHuaELwdonqzJQfZfmk2EFHNGjvniJAwYFYd6WiMhwpVIWQT540E040eyW4AyATRUeKfVL0N614f3ETf51aoZqs5O7YxF7lUCaIVOf3U8iPjNxVvj7_7aB6aJBdr8YqyYDzakqLfDcaj8TAG4Xeug6AuUVv5UUEznMFBOmtZfpxcJu6uW4M9pi0a3CKZ3MM4Ewh4fazsikdTDVpOvx",
  },
  {
    title: "Art of Lashes",
    desc: "Defining beauty through precision. Our tools are designed for professional results at home.",
    category: "Beauty",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBKDHGyjeyoG12YBdsW2FEER2DMrGaYJz48bhsPNTHEMrWHwXCWNnU08ODTpxFFSxohBU_06aw2DR_8cdr9asDZBpJjTZe6xDO0bcVNHAujz1x84CKXhLGWu3QBXl5u5QdvDgQzEmZYW62V2RqP4-PXcnTRSkCB_ng-VHeKRSVgtwsqnPvPafumJ9NIRcTB3oaVidemLcFZ9s3vAGMDh2vV0RIXbfksriFv-pnvGqaZoYdinnitpL7H",
  },
  {
    title: "City Wander",
    desc: "Effortless luxury for the modern nomad. Accessories that move with you.",
    category: "Outerwear",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBvTFUvj9XlSb8gywEbJvKr6NDpGbN4ea-8kfrZQTBgi7QMoDssLHXHtbr_FEGuEvId1nfK1nxaWJJAQQ38BZjqIEMcASSiBOdDVqtAeRL9Ety-4J69cmaHHjLAEncSXd0O4PocCs3oZguOnP7w86v9PKhtcDstFF0Qg0St0bgL7gE47URfUC-w4DdtulAwmHA0dWIhzctUiJlLRwKOs4vB4cC5tePJlRvfw8T61z_whgDfd1TbA_06",
  },
];

function Gallery() {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const openLightbox = (index) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  return (
    <>
      <PageTransition>
      <main className="pt-32 pb-section-gap overflow-x-hidden">
        {/* Header */}
        <header className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto mb-20">
          <div className="max-w-2xl">
            <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-6 leading-tight">
              Editorial <br />
              <span className="italic font-normal">Journal</span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
              A curated visual archive of tactile moments, soft light, and the
              delicate craftsmanship of DL Accessories. Explore our seasonal
              aesthetics through a luxury lifestyle lens.
            </p>
          </div>
        </header>

        {/* Masonry Gallery Grid */}
        <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
          <div className="masonry-grid">
            {galleryData.map((item, index) => (
              <div
                key={index}
                className="masonry-item gallery-item group cursor-pointer"
                onClick={() => openLightbox(index)}
              >
                <div className="relative overflow-hidden bg-surface-container-low rounded-lg custom-shadow">
                  <img
                    className="w-full h-auto object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700"
                    src={item.image}
                    alt={item.title}
                  />
                  <div className="gallery-overlay absolute inset-0 bg-primary/10 opacity-0 transition-opacity duration-500 flex flex-col justify-end p-8">
                    <span className="font-label-md text-label-md text-white tracking-widest uppercase">
                      {item.title}
                    </span>
                  </div>
                </div>
                <div className="mt-4 px-2">
                  <p className="font-label-sm text-label-sm text-outline tracking-wider uppercase">
                    {item.category}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Featured CTA Section */}
        <section className="mt-section-gap bg-surface-container-low py-24 px-margin-mobile md:px-margin-desktop overflow-hidden">
          <div className="max-w-container-max mx-auto grid grid-cols-1 md:grid-cols-2 gap-gutter items-center">
            <div className="relative">
              <div className="w-full aspect-[4/5] bg-surface overflow-hidden rounded-lg custom-shadow">
                <img
                  className="w-full h-full object-cover"
                  alt="Editorial"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7J_FTr_jw7bsz2M1nDPQeo-HoI8kwOyMQSHgWA3b5mbhV2OyaeskmBwPhRY_qTcow79Uim-86786Su54vHWATyRbXqkkDMt7J2fZeMEwm5fALeQTqMGQePsJYGTIWH0sN-fyjidv8wFoI5MQ59FPORXLeiJc7ZlZ2lXG679Syrfgx2pAQlIeRpRyvjG-UrMxGIljPuCTK2g-IOQ3h_gQmnK_hDxf770tQo8QFuOCX11cImDN9AN4Z"
                />
              </div>
              <div className="absolute -bottom-12 -right-12 hidden lg:block w-64 h-64 bg-primary-container rounded-full opacity-20 blur-3xl" />
            </div>
            <div className="md:pl-12">
              <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-8 leading-tight">
                The Art of <br />
                Minimalist Adornment
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant mb-12">
                Our pieces are designed to be an extension of your
                personality—quiet, confident, and enduringly elegant. Discover
                the full collection and find your signature style.
              </p>
              <Link
                to="/collections"
                className="inline-block px-10 py-4 bg-primary text-on-primary rounded-full font-label-md text-label-md hover:opacity-90 transition-all custom-shadow active:scale-95"
              >
                Shop the Collection
              </Link>
            </div>
          </div>
        </section>
      </main>
      </PageTransition>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
          onClick={closeLightbox}
        >
          <button
            className="absolute top-8 right-8 text-on-surface hover:opacity-50 transition-opacity z-10"
            onClick={closeLightbox}
          >
            <span className="material-symbols-outlined text-4xl">close</span>
          </button>
          <div
            className="max-w-4xl w-full h-full flex flex-col md:flex-row items-center gap-6 md:gap-12 overflow-y-auto md:overflow-hidden py-8 md:py-12"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full md:w-2/3 h-full flex items-center justify-center">
              <img
                className="max-w-full max-h-full object-contain rounded-sm custom-shadow"
                src={galleryData[lightboxIndex].image}
                alt={galleryData[lightboxIndex].title}
              />
            </div>
            <div className="w-full md:w-1/3 text-left">
              <h3 className="font-headline-md text-headline-md mb-4 text-primary">
                {galleryData[lightboxIndex].title}
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-8">
                {galleryData[lightboxIndex].desc}
              </p>
              <div className="flex items-center gap-4">
                <Link
                  to="/collections"
                  className="flex-1 px-8 py-3 bg-primary text-on-primary rounded-full font-label-md text-label-md text-center"
                >
                  Shop Item
                </Link>
                <button className="p-3 border border-outline-variant rounded-full hover:bg-surface-container transition-colors">
                  <span className="material-symbols-outlined">favorite</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Gallery;
