import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import CategoryCard from "../Component/CategoryCard";
import TestimonialCard from "../Component/TestimonialCard";
import HomeProductCard from "../Component/HomeProductCard";
import { CardSkeleton } from "../Component/LoadingSkeleton";
import PageTransition from "../Component/PageTransition";
import SEO from "../Component/SEO";
import ScrollReveal from "../Component/ScrollReveal";
import { images } from "../Data/images";
import useProducts from "../Hooks/useProducts";
import useTranslation from "../i18n/useTranslation";
import { formatDZD } from "../lib/currency";

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
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCOQTU1ESJhF1jmypkLJSVAzG9VMZo02a5J2HhOLyypxfvrbwxtFQVmesyw7TsNuwiB2HMYuAi7PYZ9QWnrCobP66WadqF4vsuoERZ97Z_vaOA2yjDDrMeisl1gAZ80vuhLjJE1JAY3ZhvSfFWo-Fs5edcn82EYhILwUM0bpMZQY-O12v0ruDU0B-q0-Z4ZKHceS1RWJdbKz6ErjNju-n7cwWriax0B3fQGicLtjbnWlvAOBEaxstUf",
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
  const categoryScrollRef = useRef(null);
  const bestSellersScrollRef = useRef(null);
  const heroRef = useRef(null);
  const { products: newArrivals, loading: arrivalsLoading } = useProducts({ newArrival: true });
  const { products: bestSellers, loading: sellersLoading } = useProducts({ bestSeller: true });
  const { t } = useTranslation();

  // Hero parallax
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);

  const handleScroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  const handleCategoryScroll = (dir) => {
    categoryScrollRef.current?.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  const handleBestSellersScroll = (dir) => {
    bestSellersScrollRef.current?.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  return (
    <PageTransition>
    <div className="Home">
      <SEO
        title="DL Accessories"
        description="Curated accessories for the modern muse — watches, jewelry, nails, and lashes crafted for timeless elegance."
      />

      {/* SECTION 1: HERO — with parallax */}
      <section ref={heroRef} className="relative h-screen w-full overflow-hidden">
        <motion.div className="absolute inset-0" style={{ y: heroY, scale: heroScale }}>
          <img src={images.hero} alt="Hero" className="w-full h-full object-cover" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/15 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />
        <motion.div
          className="relative z-10 h-full flex items-center"
          style={{ opacity: heroOpacity }}
        >
          <div className="max-w-2xl px-margin-mobile md:px-margin-desktop pt-20">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="inline-block font-label-sm text-white/70 uppercase tracking-[0.25em] mb-6 border-l-2 border-primary-container pl-4"
            >
              {t("hero_tag")}
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="font-display-lg text-[44px] md:text-display-lg text-white mb-6 leading-tight drop-shadow-lg"
            >
              {t("hero_title_1")} <span className="italic font-light">{t("hero_title_2")}</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="font-body-lg text-body-lg text-white/90 mb-10 max-w-lg drop-shadow-md leading-relaxed"
            >
              {t("hero_desc")}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <Link to="/collections" className="inline-flex items-center gap-3 bg-white text-primary px-8 md:px-10 py-4 rounded-full font-label-md uppercase tracking-widest hover:bg-primary hover:text-white transition-all duration-500 shadow-xl shadow-black/10">
                {t("hero_cta")}
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </Link>
            </motion.div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="hidden lg:block absolute right-8 md:right-16 top-1/2 -translate-y-1/2 z-10 space-y-5"
        >
          <div className="bg-white/15 backdrop-blur-xl border border-white/25 rounded-2xl px-6 py-5 text-white w-52 shadow-xl">
            <p className="text-label-sm text-white/60 uppercase tracking-widest mb-1.5">{t("hero_new_in")}</p>
            <p className="font-headline-sm text-headline-sm leading-tight">{t("hero_new_in_item")}</p>
          </div>
          <div className="bg-white/15 backdrop-blur-xl border border-white/25 rounded-2xl px-6 py-5 text-white w-52 shadow-xl">
            <p className="text-label-sm text-white/60 uppercase tracking-widest mb-1.5">{t("hero_bestseller")}</p>
            <p className="font-headline-sm text-headline-sm leading-tight">{t("hero_bestseller_item")}</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/50"
        >
          <span className="font-label-sm text-xs uppercase tracking-widest">{t("hero_scroll")}</span>
          <span className="material-symbols-outlined text-lg animate-bounce">expand_more</span>
        </motion.div>
      </section>

      {/* SECTION 2: CURATED SELECTIONS */}
      <section className="bg-background py-section-gap section-divider">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <ScrollReveal>
            <div className="flex justify-between items-center mb-12">
              <div>
                <span className="font-label-sm text-primary uppercase tracking-[0.25em] mb-2 block">{t("cat_label")}</span>
                <h2 className="font-display-lg text-display-lg-mobile md:text-headline-md text-on-surface">{t("cat_title")}</h2>
              </div>
              <div className="flex items-center gap-4">
                <Link to="/collections" className="hidden md:flex items-center gap-1.5 font-label-sm text-secondary uppercase tracking-widest hover:text-primary transition-colors border-b border-outline-variant/30 pb-0.5 hover:border-primary/30">{t("cat_view_all")}</Link>
                <div className="hidden md:flex gap-2">
                  <button onClick={() => handleCategoryScroll("left")} className="w-10 h-10 rounded-full border border-outline/20 flex items-center justify-center text-on-surface-variant hover:bg-white hover:border-primary/30 hover:text-primary transition-all duration-300" aria-label="Scroll left"><span className="material-symbols-outlined text-lg">chevron_left</span></button>
                  <button onClick={() => handleCategoryScroll("right")} className="w-10 h-10 rounded-full border border-outline/20 flex items-center justify-center text-on-surface-variant hover:bg-white hover:border-primary/30 hover:text-primary transition-all duration-300" aria-label="Scroll right"><span className="material-symbols-outlined text-lg">chevron_right</span></button>
                </div>
              </div>
            </div>
          </ScrollReveal>
          <div ref={categoryScrollRef} className="flex gap-6 overflow-x-auto hide-scrollbar scroll-smooth pb-2 -mx-4 px-4">
            {categories.map((cat, idx) => (
              <ScrollReveal key={cat.name} delay={idx * 0.08} direction="up" distance={30} className="min-w-[90px] max-w-[120px] flex-shrink-0">
                <CategoryCard name={cat.name} image={cat.image} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: NEW ARRIVALS */}
      <section className="bg-surface-container-low py-section-gap overflow-hidden">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <ScrollReveal>
            <div className="flex justify-between items-center mb-12">
              <div>
                <span className="font-label-sm text-primary uppercase tracking-[0.25em] mb-2 block">{t("arrivals_label")}</span>
                <h2 className="font-display-lg text-display-lg-mobile md:text-headline-md text-on-surface">{t("arrivals_title")}</h2>
              </div>
              <div className="flex items-center gap-4">
                <Link to="/collections" className="hidden md:flex items-center gap-1.5 font-label-sm text-secondary uppercase tracking-widest hover:text-primary transition-colors border-b border-outline-variant/30 pb-0.5 hover:border-primary/30">{t("arrivals_shop_all")}</Link>
                <div className="hidden md:flex gap-2">
                  <button onClick={() => handleScroll("left")} className="w-10 h-10 rounded-full border border-outline/20 flex items-center justify-center text-on-surface-variant hover:bg-white hover:border-primary/30 hover:text-primary transition-all duration-300" aria-label="Scroll left"><span className="material-symbols-outlined text-lg">chevron_left</span></button>
                  <button onClick={() => handleScroll("right")} className="w-10 h-10 rounded-full border border-outline/20 flex items-center justify-center text-on-surface-variant hover:bg-white hover:border-primary/30 hover:text-primary transition-all duration-300" aria-label="Scroll right"><span className="material-symbols-outlined text-lg">chevron_right</span></button>
                </div>
              </div>
            </div>
          </ScrollReveal>
          <div ref={scrollRef} className="flex gap-4 overflow-x-auto hide-scrollbar scroll-smooth pb-2 -mx-4 px-4">
            {arrivalsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="min-w-[200px] md:min-w-[220px] flex-shrink-0"><CardSkeleton /></div>
              ))
            ) : (
              newArrivals.map((item, idx) => (
                <ScrollReveal key={item.id} delay={idx * 0.1} direction="right" distance={40} className="min-w-[200px] md:min-w-[220px] max-w-[280px] flex-shrink-0">
                  <HomeProductCard product={item} />
                </ScrollReveal>
              ))
            )}
          </div>
          <div className="flex justify-center mt-8 md:hidden">
            <Link to="/collections" className="inline-flex items-center gap-1.5 font-label-sm text-primary uppercase tracking-widest border-b border-primary/30 pb-0.5 hover:border-primary transition-all">{t("arrivals_shop_all_mobile")}<span className="material-symbols-outlined text-base">arrow_forward</span></Link>
          </div>
        </div>
      </section>

      {/* SECTION 4: BEST SELLERS */}
      <section className="py-section-gap section-divider">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <ScrollReveal>
            <div className="flex justify-between items-center mb-12">
              <div>
                <span className="font-label-sm text-primary uppercase tracking-[0.25em] mb-2 block">{t("sellers_label")}</span>
                <h2 className="font-display-lg text-display-lg text-on-surface">{t("sellers_title")}</h2>
              </div>
              <div className="flex items-center gap-4">
                <Link to="/collections" className="hidden md:flex items-center gap-1.5 font-label-sm text-secondary uppercase tracking-widest hover:text-primary transition-colors border-b border-outline-variant/30 pb-0.5 hover:border-primary/30">{t("sellers_shop_all")}</Link>
                <div className="hidden md:flex gap-2">
                  <button onClick={() => handleBestSellersScroll("left")} className="w-10 h-10 rounded-full border border-outline/20 flex items-center justify-center text-on-surface-variant hover:bg-white hover:border-primary/30 hover:text-primary transition-all duration-300" aria-label="Scroll left"><span className="material-symbols-outlined text-lg">chevron_left</span></button>
                  <button onClick={() => handleBestSellersScroll("right")} className="w-10 h-10 rounded-full border border-outline/20 flex items-center justify-center text-on-surface-variant hover:bg-white hover:border-primary/30 hover:text-primary transition-all duration-300" aria-label="Scroll right"><span className="material-symbols-outlined text-lg">chevron_right</span></button>
                </div>
              </div>
            </div>
          </ScrollReveal>
          <div ref={bestSellersScrollRef} className="flex gap-6 overflow-x-auto hide-scrollbar scroll-smooth pb-2 -mx-4 px-4">
            {sellersLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="min-w-[240px] flex-shrink-0"><CardSkeleton /></div>
              ))
            ) : (
              bestSellers.map((item, idx) => (
                <ScrollReveal key={item.id} delay={idx * 0.1} direction="right" distance={40} className="min-w-[240px] max-w-[280px] flex-shrink-0">
                  <Link to={`/product/${item.id}`} className="group cursor-pointer block">
                    <div className="relative aspect-[3/4] bg-surface-container-low rounded-2xl overflow-hidden mb-5 shadow-sm">
                      {item.image ? (
                        <img src={item.image} alt={item.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-surface-container-low text-secondary">
                          <span className="material-symbols-outlined text-3xl">image</span>
                        </div>
                      )}
                      <span className="absolute top-4 left-4 bg-primary-container/20 text-on-background text-[10px] font-label-sm uppercase tracking-widest px-3 py-1.5 rounded-full">{t("sellers_badge")}</span>
                    </div>
                    <div className="text-center">
                      <h3 className="font-headline-sm text-lg text-on-surface group-hover:text-primary transition-colors mb-1">{item.name}</h3>
                      <p className="font-label-md text-on-surface-variant">{formatDZD(item.sale_price || item.price)}</p>
                    </div>
                  </Link>
                </ScrollReveal>
              ))
            )}
          </div>
        </div>
      </section>

      {/* SECTION 5: MOOD BOARD */}
      <section className="py-section-gap bg-surface-container-low overflow-hidden">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <ScrollReveal>
            <div className="text-center mb-16">
              <span className="font-label-sm text-primary uppercase tracking-[0.25em] mb-3 block">{t("mood_label")}</span>
              <h2 className="font-display-lg text-display-lg text-on-surface">{t("mood_title")}</h2>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-[160px] md:auto-rows-[200px]">
            {moodImages.map((img, idx) => (
              <ScrollReveal
                key={idx}
                delay={idx * 0.08}
                direction={idx % 2 === 0 ? "up" : "down"}
                distance={30}
                className={img.className}
              >
                <div className="rounded-xl overflow-hidden group cursor-pointer h-full">
                  <img src={img.src} alt={`Mood ${idx + 1}`} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: REVIEWS */}
      <section className="py-section-gap section-divider">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <ScrollReveal>
            <div className="text-center mb-16">
              <span className="font-label-sm text-primary uppercase tracking-[0.25em] mb-3 block">{t("reviews_label")}</span>
              <h2 className="font-display-lg text-display-lg text-on-surface mb-3">{t("reviews_title")}</h2>
              <p className="font-body-md text-secondary max-w-md mx-auto">{t("reviews_desc")}</p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {testimonials.map((t, idx) => (
              <ScrollReveal key={t.name} delay={idx * 0.15} direction="up" distance={40}>
                <TestimonialCard quote={t.quote} name={t.name} image={t.image} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7: INSTAGRAM */}
      <section className="py-section-gap bg-surface-container-low">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <ScrollReveal>
            <div className="flex items-center justify-between mb-12">
              <div>
                <span className="font-label-sm text-primary uppercase tracking-[0.25em] mb-2 block">{t("instagram_label")}</span>
                <h2 className="font-display-lg text-display-lg-mobile md:text-headline-md text-on-surface">@DL.ACCESSORIES</h2>
              </div>
              <a href="https://www.instagram.com/dl.accessoires.reghaia/" target="_blank" rel="noopener noreferrer" className="hidden md:inline-flex items-center gap-2 font-label-sm text-primary uppercase tracking-widest border-b border-primary/30 pb-0.5 hover:border-primary transition-all">
                {t("follow_us")} <span className="material-symbols-outlined text-base">open_in_new</span>
              </a>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
            {instagramImages.map((src, idx) => (
              <ScrollReveal key={idx} delay={idx * 0.06} direction="up" distance={20}>
                <a href="https://www.instagram.com/dl.accessoires.reghaia/" target="_blank" rel="noopener noreferrer" className="relative group overflow-hidden rounded-xl aspect-square bg-surface-container-low block">
                  <img src={src} alt={`Instagram ${idx + 1}`} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-primary/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-3xl drop-shadow-lg">favorite</span>
                  </div>
                </a>
              </ScrollReveal>
            ))}
          </div>
          <div className="flex justify-center mt-8 md:hidden">
            <a href="https://www.instagram.com/dl.accessoires.reghaia/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-label-sm text-primary uppercase tracking-widest border-b border-primary/30 pb-0.5 hover:border-primary transition-all">
              {t("follow_us")} @DL.ACCESSORIES <span className="material-symbols-outlined text-base">open_in_new</span>
            </a>
          </div>
        </div>
      </section>

    </div>
    </PageTransition>
  );
};

export default Home;
