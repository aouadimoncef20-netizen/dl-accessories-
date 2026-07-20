import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import CategoryCard from "../Component/CategoryCard";
import TestimonialCard from "../Component/TestimonialCard";
import Newsletter from "../Component/Newsletter";
import PageTransition from "../Component/PageTransition";
import { images } from "../Data/images";
import useProductStore from "../stores/productStore";

const categories = [
  { name: "Watches", image: images.categories.Watches },
  { name: "Bracelets", image: images.categories.Bracelets },
  { name: "Rings", image: images.categories.Rings },
  { name: "Earrings", image: images.categories.Earrings },
  { name: "Sets", image: images.categories.Sets },
  { name: "Nails", image: images.categories.Nails },
  { name: "Lashes", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDSvmpss7xhzs__hqie98CLYq6xWuSp9Qt72ClqUKjbJIfNO1yTajwihgaFCrw8AK1F1HrVrZ_cwXCHzQepY-hL9rqlmqqEMhaGrktNtgMyQjN3nFukjA_oXdp9C_ptkDyJDt0mjmA266l0wuez7bB04VmefzNEckmRnEDJG7-2FTomjTIAQz0LFbMr6TZQ1q-lj5nAzvqTWZubdjgAqV48NUpDYXi3axL1IKhb2sR_fGV1jdMODBAc" },
];

const testimonials = [
  { quote: "The quality of the products exceeded all my expectations. It feels premium and works with every outfit.", name: "Elena Roberts", image: images.reviews[0] },
  { quote: "The most delicate pieces I own. I haven't taken off the link chain since it arrived two months ago. No tarnishing at all.", name: "Sophia Chen", image: images.reviews[1] },
  { quote: "DL Accessories has become my go-to for gifts. The packaging is as beautiful as the products themselves.", name: "Marcus Thorne", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCptFgxBV3HbnSzlSFTsz5YYmrxOkMhntbTxOtyQK7k_cfh8SApfrwkx90nIAlsW9ieOYl6TPI-I86uH5RqwN12phua9rewm5i6MyFKOHoLwhiRXt7ZUKaau-mNgGVi886nh4gSEdmchtJ51NxLU5_mHXQSQe6SlpWyXqfXCNJrG66HrmYS79y9UzSwPbMzq_2vzup-n5OQzJmAQM1qoOPwaRtyouIl4-UrX0EhbxRgs5izU06uap" },
];

const instagramImages = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCOQTU1ESJhF1jmypkLJSVAzG9VMZo02a5J2HhOLyypxfvrbwxtFQVmesyw7TsNuwiB2HMYuAi7PYZ9WQnrCobP66WadqF4vsuoERZ97Z_vaOA2yjDDrMeisl1gAZ80vuhLjJE1JAY3ZhvSfFWo-Fs5edcn82EYhILwUM0bpMZQY-O12v0ruDU0B-q0-Z4ZKHceS1RWJdbKz6ErjNju-n7cwWriax0B3fQGicLtjbnWlvAOBEaxstUf",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDaZIlJMXOmGrMgmLG_kwc2Ouj8H5kaOK2HKCFLmrmpRWOFzozUhUMyZPzoFGizvh9AB7BjVkR9peVjaHtj3uxcO2cspVmXSLoDJuK9kLRDrkznKRCt2rPXnM4hDBrcTGnxU-GtEMLwfO-lqbqd5HcbzpGq1fmbgBjrYi1M9pn5nKHC23XmR44-iTcM-eTZMxep10mBlekrgsNToKJsw2uh7xnN8Ud5WzBd8d1F0WrpamS9ukB6ZaAm",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBO63obDnF7ABtksR8TEjzkMg4WuaFSxm74gc2reNG3HVXfn_O2Aari920MQT67cAaihswPKRL_cFR7mPWBq932EYpfdZ00uvpcNGXJfjNA4x5v6Boqv_G3wt_f7O3NrwJL8ZsfAAyR04OKuFc4WautIMbG5hy8fQYW9SKX0OpTk_-3T4ScfVmaiXuMuw9GiU6bEtM6vjOvUihLPnRGDa5uvg0ZluA4FpfVZ-YaA-BUImFYFayh-uJp",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCgUxzrMmDAayPLb2292dgn0W1TBYzTxham5VF5kJEhMgSAivcwcq_04oSJCH6tr1SNDLcY_KDz16OLHHcK36oxHpRUEdBpwFOeSXMbOd0gn25NXl_ahCtilbPWowA8DDFiCaxyFccL6tIGtJ1Y6ZQzrpR89gmsGj_wDn4ScQpuW9cNGujj07Qg0Miwt1lLYvJqAgw9BCPtESwfNeT7J6cBVA27BTjDC4q0uA5sXLNLgnkVz42wRlMc",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBQdV7K5F4yFOsNPXlOTALu_vUk-4nml9rsfLuanneL8Kc9nSg0KPjhUQgWKg3VJSTdGuZPTsPDg3cHqmRVKYROWCM4M3sczygYYV5eN14zV5-Oj5sk0rgTizJtjsipE9V9K4bIq9KEHOkVm8AiSHVYdOy4lVw4wqBxszRCf0u7SSRAlJm9hvHtSJ4kls3nzXBl8xvpz6wL53IPc8LMcsNT8r0Fgh7_kH0p6cCTWHL8FNbdern90iEf",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC9Cp-y6zWcR_fv_MkxmacL76-0lCv5o8TZwF9uD5E9_xuEIzqKWVUVdtaXeDMszd5k3MThfymnoByIlytpea5vSKHPcfvroo14kf6HKKEVTfHLHq0fzAiiMCaaAa0Wg_jPxUg8NSgvbAOkGQvuzBgnHJM5_L0QgfpSmBGvDh93jsQjKHwjky9sB3SsSkyYp8RW_cllu5v409xRn69Un7uV71zrYUJnCueomsQRTDTPbi3VYkJIDfL6",
];

const moodImages = [
  { src: images.moodBoard[0], className: "md:row-span-2" },
  { src: images.moodBoard[1], className: "" },
  { src: images.moodBoard[2], className: "md:row-span-3" },
  { src: images.moodBoard[3], className: "" },
  { src: images.moodBoard[4], className: "md:col-span-2" },
  { src: "https://lh3.googleusercontent.com/aida-public/AB6AXuAcAzyR2yUyGXTxJZggTqVy4ItYcG4xePwu4SorJn9tE7XZpWNXAMMG8kG2TAkkKxGlmO0F8zjBWh-ebN_mb0FdDBAQf8t6BBB5iBSYHjmJCHZnJQ8K14yBmHkagGN6sfHUySI-L-m2RpaH4Kj_BfyJRjLa1cgKmonuUlNLcJiUd84HSHJGSgPcHLAbpaRfOzkq15t_wIyH5fMrBWbCOIJKznt44x6SQi07LDXOEZSzdt2c_cNJANlF", className: "" },
];

const Home = () => {
  const scrollRef = useRef(null);
  const { newArrivals, featured, fetchNewArrivals, fetchFeatured } = useProductStore();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchNewArrivals(); fetchFeatured(); }, []);

  const handleScroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  // Fallback if Supabase not yet connected
  const arrivals = newArrivals.length > 0 ? newArrivals : null;
  const sellers = featured.length > 0 ? featured : null;

  return (
    <PageTransition>
    <div className="Home">

      {/* SECTION 1: HERO */}
      <section className="relative h-screen w-full overflow-hidden">
        <div className="absolute inset-0">
          <img src={images.hero} alt="Hero" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/10 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10" />
        <div className="relative z-10 h-full flex items-center">
          <div className="max-w-2xl px-margin-mobile md:px-margin-desktop pt-20">
            <span className="inline-block font-label-sm text-white/70 uppercase tracking-[0.25em] mb-6 border-l-2 border-primary-container pl-4">
              DL Accessories — New Season
            </span>
            <h1 className="font-display-lg text-[44px] md:text-display-lg text-white mb-6 leading-tight drop-shadow-lg">
              Details Make You{" "}<span className="italic font-light">Shine</span>
            </h1>
            <p className="font-body-lg text-body-lg text-white/90 mb-10 max-w-lg drop-shadow-md leading-relaxed">
              Curated accessories for the modern muse — where every detail speaks of timeless elegance and quiet confidence.
            </p>
            <Link to="/collections" className="inline-flex items-center gap-3 bg-white text-primary px-8 md:px-10 py-4 rounded-full font-label-md uppercase tracking-widest hover:bg-primary hover:text-white transition-all duration-500 shadow-xl shadow-black/10">
              Discover Collection
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>
          </div>
        </div>
        <div className="hidden lg:block absolute right-8 md:right-16 top-1/2 -translate-y-1/2 z-10 space-y-5">
          <div className="bg-white/15 backdrop-blur-xl border border-white/25 rounded-2xl px-6 py-5 text-white w-52 shadow-xl">
            <p className="text-label-sm text-white/60 uppercase tracking-widest mb-1.5">New In</p>
            <p className="font-headline-sm text-headline-sm leading-tight">Celestial Rings</p>
          </div>
          <div className="bg-white/15 backdrop-blur-xl border border-white/25 rounded-2xl px-6 py-5 text-white w-52 shadow-xl">
            <p className="text-label-sm text-white/60 uppercase tracking-widest mb-1.5">Bestseller</p>
            <p className="font-headline-sm text-headline-sm leading-tight">Aura Watch Series</p>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/50">
          <span className="font-label-sm text-xs uppercase tracking-widest">Scroll</span>
          <span className="material-symbols-outlined text-lg animate-bounce">expand_more</span>
        </div>
      </section>

      {/* SECTION 2: CURATED SELECTIONS */}
      <section className="bg-background py-section-gap">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="flex flex-col md:flex-row justify-between items-end mb-14 gap-4">
            <div>
              <span className="font-label-sm text-primary uppercase tracking-[0.25em] mb-3 block">Browse by Category</span>
              <h2 className="font-display-lg text-display-lg-mobile md:text-headline-md text-on-surface">Curated Selections</h2>
            </div>
            <Link to="/collections" className="hidden md:flex items-center gap-1.5 font-label-sm text-secondary uppercase tracking-widest hover:text-primary transition-colors border-b border-outline-variant/30 pb-0.5 hover:border-primary/30">
              View All Categories
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-5">
            {categories.map((cat) => (
              <CategoryCard key={cat.name} name={cat.name} image={cat.image} />
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: NEW ARRIVALS (Supabase-connected) */}
      {arrivals && (
        <section className="bg-surface-container-low py-section-gap overflow-hidden">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
            <div className="flex justify-between items-center mb-12">
              <div>
                <span className="font-label-sm text-primary uppercase tracking-[0.25em] mb-2 block">Just Dropped</span>
                <h2 className="font-display-lg text-display-lg-mobile md:text-headline-md text-on-surface">New Arrivals</h2>
              </div>
              <div className="flex items-center gap-4">
                <Link to="/collections" className="hidden md:flex items-center gap-1.5 font-label-sm text-secondary uppercase tracking-widest hover:text-primary transition-colors border-b border-outline-variant/30 pb-0.5 hover:border-primary/30">Shop All</Link>
                <div className="hidden md:flex gap-2">
                  <button onClick={() => handleScroll("left")} className="w-10 h-10 rounded-full border border-outline/20 flex items-center justify-center text-on-surface-variant hover:bg-white hover:border-primary/30 hover:text-primary transition-all duration-300" aria-label="Scroll left"><span className="material-symbols-outlined text-lg">chevron_left</span></button>
                  <button onClick={() => handleScroll("right")} className="w-10 h-10 rounded-full border border-outline/20 flex items-center justify-center text-on-surface-variant hover:bg-white hover:border-primary/30 hover:text-primary transition-all duration-300" aria-label="Scroll right"><span className="material-symbols-outlined text-lg">chevron_right</span></button>
                </div>
              </div>
            </div>
            <div ref={scrollRef} className="flex gap-4 overflow-x-auto hide-scrollbar scroll-smooth pb-2 -mx-4 px-4">
              {arrivals.map((item) => (
                <div key={item.id} className="min-w-[200px] md:min-w-[220px] flex-shrink-0">
                  <div className="bg-white p-4 rounded-xl ambient-glow group">
                    <div className="aspect-[4/5] rounded-lg overflow-hidden mb-3 relative">
                      <Link to={`/product/${item.id}`}><img src={item.images?.[0] || item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" /></Link>
                      <span className="absolute top-2 left-2 bg-primary-container/20 text-on-background text-[10px] font-label-sm uppercase tracking-widest px-2 py-0.5 rounded-full">New</span>
                    </div>
                    <Link to={`/product/${item.id}`} className="block">
                      <h3 className="font-headline-sm text-sm text-on-surface mb-0.5 leading-tight truncate">{item.name}</h3>
                      <p className="font-label-sm text-[10px] text-secondary uppercase tracking-widest mb-1.5">{item.category}</p>
                      <p className="font-label-md text-primary font-semibold">${(item.sale_price || item.price)?.toFixed(2) || "—"}</p>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-8 md:hidden">
              <Link to="/collections" className="inline-flex items-center gap-1.5 font-label-sm text-primary uppercase tracking-widest border-b border-primary/30 pb-0.5 hover:border-primary transition-all">Shop All New Arrivals<span className="material-symbols-outlined text-base">arrow_forward</span></Link>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 4: BEST SELLERS (Supabase-connected) */}
      {sellers && (
        <section className="py-section-gap">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
            <div className="text-center mb-16">
              <span className="font-label-sm text-primary uppercase tracking-[0.25em] mb-3 block">Most Loved</span>
              <h2 className="font-display-lg text-display-lg text-on-surface">Your favorites</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {sellers.map((item, idx) => {
                const isOffset = idx === 1;
                const img = item.images?.[0] || item.image;
                return (
                  <Link key={item.id} to={`/product/${item.id}`}
                    className={`group cursor-pointer block ${isOffset ? "md:mt-10" : ""}`}>
                    <div className="relative aspect-[3/4] bg-surface-container-low rounded-2xl overflow-hidden mb-5 shadow-sm">
                      <img src={img} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
                      <span className="absolute top-4 left-4 bg-primary-container/20 text-on-background text-[10px] font-label-sm uppercase tracking-widest px-3 py-1.5 rounded-full">Best Seller</span>
                    </div>
                    <div className="text-center">
                      <h3 className="font-headline-sm text-lg text-on-surface group-hover:text-primary transition-colors mb-1">{item.name}</h3>
                      <p className="font-label-md text-on-surface-variant">${(item.sale_price || item.price)?.toFixed(2) || "—"}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* SECTION 5: MOOD BOARD */}
      <section className="py-section-gap bg-surface-container-low">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="text-center mb-16">
            <span className="font-label-sm text-primary uppercase tracking-[0.25em] mb-3 block">Inspiration</span>
            <h2 className="font-display-lg text-display-lg text-on-surface">Mood Board</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-[160px] md:auto-rows-[200px]">
            {moodImages.map((img, idx) => (
              <div key={idx} className={`rounded-xl overflow-hidden group cursor-pointer ${img.className}`}>
                <img src={img.src} alt={`Mood ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: REVIEWS */}
      <section className="py-section-gap">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="text-center mb-16">
            <span className="font-label-sm text-primary uppercase tracking-[0.25em] mb-3 block">Testimonials</span>
            <h2 className="font-display-lg text-display-lg text-on-surface mb-3">Worn by the Muses</h2>
            <p className="font-body-md text-secondary max-w-md mx-auto">Join thousands who have elevated their style with DL Accessories.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {testimonials.map((t) => (
              <TestimonialCard key={t.name} quote={t.quote} name={t.name} image={t.image} />
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7: INSTAGRAM */}
      <section className="py-section-gap bg-surface-container-low">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="flex items-center justify-between mb-12">
            <div>
              <span className="font-label-sm text-primary uppercase tracking-[0.25em] mb-2 block">Social</span>
              <h2 className="font-display-lg text-display-lg-mobile md:text-headline-md text-on-surface">@DL.ACCESSORIES</h2>
            </div>
            <a href="https://www.instagram.com/dl.accessoires.reghaia/" target="_blank" rel="noopener noreferrer" className="hidden md:inline-flex items-center gap-2 font-label-sm text-primary uppercase tracking-widest border-b border-primary/30 pb-0.5 hover:border-primary transition-all">
              Follow Us <span className="material-symbols-outlined text-base">open_in_new</span>
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
            {instagramImages.map((src, idx) => (
              <a key={idx} href="https://www.instagram.com/dl.accessoires.reghaia/" target="_blank" rel="noopener noreferrer" className="relative group overflow-hidden rounded-xl aspect-square bg-surface-container-low">
                <img src={src} alt={`Instagram ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-primary/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-3xl drop-shadow-lg">favorite</span>
                </div>
              </a>
            ))}
          </div>
          <div className="flex justify-center mt-8 md:hidden">
            <a href="https://www.instagram.com/dl.accessoires.reghaia/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-label-sm text-primary uppercase tracking-widest border-b border-primary/30 pb-0.5 hover:border-primary transition-all">
              Follow Us @DL.ACCESSORIES <span className="material-symbols-outlined text-base">open_in_new</span>
            </a>
          </div>
        </div>
      </section>

      {/* SECTION 8: NEWSLETTER */}
      <Newsletter />

    </div>
    </PageTransition>
  );
};

export default Home;
