import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import CategoryCard from "../Component/CategoryCard";
import TestimonialCard from "../Component/TestimonialCard";
import HomeProductCard from "../Component/HomeProductCard";
import { CardSkeleton } from "../Component/LoadingSkeleton";
import PageTransition from "../Component/PageTransition";
import SEO from "../Component/SEO";
import ScrollReveal from "../Component/ScrollReveal";
import SectionHeader from "../Component/SectionHeader";
import ScrollArrows from "../Component/ScrollArrows";
import Marquee from "../Component/Marquee";
import { images } from "../Data/images";
import useProducts from "../Hooks/useProducts";
import useTranslation from "../i18n/useTranslation";
import { formatDZD } from "../lib/currency";

// A photograph whose file name contains a space (most of them do) has to be
// percent-encoded or the browser asks for a different URL than the one that
// exists. ProductCard and HomeProductCard already do this; the best-seller
// strip below used the raw string, so it alone showed broken images.
const safeSrc = (url) => {
  if (!url) return url;
  try { return encodeURI(decodeURI(url)); } catch { return encodeURI(url); }
};

const categories = [
  { name: "Watches", image: images.categories.Watches },
  { name: "Bracelets", image: images.categories.Bracelets },
  { name: "Rings", image: images.categories.Rings },
  { name: "Earrings", image: images.categories.Earrings },
  // "Packs" (not "Sets"): the tile must link to a filter the shop can answer.
  // There is no "Sets" category in the admin, so that tile opened an empty
  // collection; Packs is the real thing it was pointing at.
  { name: "Packs", image: images.categories.Sets },
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
  const { products: bestSellers, loading: sellersLoading } = useProducts({
    bestSeller: true,
    limit: 10,
  });
  const { t } = useTranslation();
  const reduced = useReducedMotion();

  // Hero parallax. The photograph drifts up more slowly than the page and
  // dissolves as the next section arrives — enough to feel layered, not enough
  // to feel like a gimmick. With reduced motion the photo simply sits still.
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
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

  const shopAll = (key) => (
    <Link
      to="/collections"
      className="link-quiet hidden font-label-sm uppercase tracking-widest text-secondary transition-colors hover:text-primary md:inline-block"
    >
      {t(key)}
    </Link>
  );

  return (
    <PageTransition>
    <div className="Home">
      <SEO
        title="DL Accessories"
        description="Curated accessories for the modern muse — watches, jewelry, nails, and lashes crafted for timeless elegance."
      />

      {/* ── HERO ──────────────────────────────────────────────
          Three layers: the photograph drifting slowly (ken burns) inside a
          parallax frame, two scrims that keep white type readable whatever
          the photo is doing, and the type itself, which fades as the visitor
          starts to read the page. */}
      <section
        ref={heroRef}
        className="relative flex min-h-[100svh] w-full items-center overflow-hidden"
      >
        <motion.div
          className="absolute inset-0"
          style={reduced ? undefined : { y: heroY, scale: heroScale }}
        >
          <img
            src={images.hero}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            className="ken-burns h-full w-full object-cover"
          />
        </motion.div>

        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/30" />
        <div className="grain absolute inset-0" />

        <motion.div
          className="relative z-10 w-full pb-24 pt-28 md:pb-16"
          style={reduced ? undefined : { opacity: heroOpacity }}
        >
          <div className="mx-auto w-full max-w-container-max px-margin-mobile md:px-margin-desktop">
            <div className="max-w-2xl">
              <motion.span
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="mb-6 flex items-center gap-3 font-label-sm uppercase tracking-[0.28em] text-white/75"
              >
                <span aria-hidden="true" className="h-px w-10 bg-white/50" />
                {t("hero_tag")}
              </motion.span>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="text-balance font-display-lg text-[40px] leading-[1.05] tracking-[-0.02em] text-white sm:text-[52px] lg:text-[68px]"
              >
                {t("hero_title_1")}{" "}
                <span className="font-light italic">{t("hero_title_2")}</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="mt-6 max-w-lg text-pretty font-body-lg text-body-lg leading-relaxed text-white/85"
              >
                {t("hero_desc")}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="mt-10 flex flex-wrap items-center gap-3 md:gap-4"
              >
                <Link
                  to="/collections"
                  className="group inline-flex items-center gap-3 rounded-full bg-white px-7 py-4 font-label-md uppercase tracking-widest text-primary shadow-[0_18px_45px_-20px_rgba(0,0,0,0.8)] transition-colors duration-500 hover:bg-primary hover:text-white md:px-9"
                >
                  {t("hero_cta")}
                  <span className="material-symbols-outlined text-lg transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180">
                    arrow_forward
                  </span>
                </Link>

                <Link
                  to="/track-order"
                  className="group inline-flex items-center gap-2.5 rounded-full border border-white/35 px-6 py-4 font-label-md uppercase tracking-widest text-white/85 backdrop-blur-sm transition-colors duration-300 hover:border-white hover:bg-white/10 hover:text-white"
                >
                  <span className="material-symbols-outlined text-lg">local_shipping</span>
                  {t("hero_cta_secondary")}
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* New in / bestseller notes. Kept off small screens, where they would
            sit on top of the headline rather than beside it. */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="absolute right-8 top-1/2 z-10 hidden -translate-y-1/2 space-y-4 xl:right-16 xl:block"
        >
          <div className="w-52 rounded-2xl border border-white/20 bg-white/10 px-6 py-5 text-white shadow-xl backdrop-blur-xl transition-colors duration-300 hover:bg-white/15">
            <p className="mb-1.5 text-label-sm uppercase tracking-widest text-white/60">{t("hero_new_in")}</p>
            <p className="font-headline-sm text-headline-sm leading-tight">{t("hero_new_in_item")}</p>
          </div>
          <div className="w-52 rounded-2xl border border-white/20 bg-white/10 px-6 py-5 text-white shadow-xl backdrop-blur-xl transition-colors duration-300 hover:bg-white/15">
            <p className="mb-1.5 text-label-sm uppercase tracking-widest text-white/60">{t("hero_bestseller")}</p>
            <p className="font-headline-sm text-headline-sm leading-tight">{t("hero_bestseller_item")}</p>
          </div>
        </motion.div>

        {/* A line that fills downward, again and again — quieter than a
            bouncing chevron, and it points at the page rather than the icon. */}
        <motion.a
          href="#curated"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="absolute bottom-7 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-3 text-white/60 transition-colors hover:text-white sm:flex"
        >
          <span className="font-label-sm text-[10px] uppercase tracking-[0.35em]">{t("hero_scroll")}</span>
          <span className="relative block h-12 w-px overflow-hidden bg-white/25">
            <span className="scroll-cue-line absolute inset-x-0 top-0 block h-full bg-white/80" />
          </span>
        </motion.a>
      </section>

      {/* ── MARQUEE ── the pause between the photograph and the shop */}
      <Marquee
        items={[t("marquee_1"), t("marquee_2"), t("marquee_3"), t("marquee_4")]}
        duration={42}
      />

      {/* ── CURATED SELECTIONS ── */}
      <section id="curated" className="scroll-mt-24 bg-background py-20 md:py-section-gap section-divider">
        <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
          <ScrollReveal>
            <SectionHeader
              eyebrow={t("cat_label")}
              title={t("cat_title")}
              action={shopAll("cat_view_all")}
              actions={<ScrollArrows onScroll={handleCategoryScroll} />}
              className="mb-12"
            />
          </ScrollReveal>

          <div
            ref={categoryScrollRef}
            className="hide-scrollbar -mx-4 flex gap-6 overflow-x-auto scroll-smooth px-4 pb-2"
          >
            {categories.map((cat, idx) => (
              <ScrollReveal
                key={cat.name}
                delay={idx * 0.08}
                direction="up"
                distance={30}
                className="min-w-[90px] max-w-[120px] flex-shrink-0"
              >
                <CategoryCard name={cat.name} image={cat.image} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEW ARRIVALS ── */}
      <section className="overflow-hidden bg-surface-container-low py-20 md:py-section-gap">
        <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
          <ScrollReveal>
            <SectionHeader
              eyebrow={t("arrivals_label")}
              title={t("arrivals_title")}
              action={shopAll("arrivals_shop_all")}
              actions={<ScrollArrows onScroll={handleScroll} />}
              className="mb-12"
            />
          </ScrollReveal>

          <div
            ref={scrollRef}
            className="hide-scrollbar -mx-4 flex gap-4 overflow-x-auto scroll-smooth px-4 pb-2"
          >
            {arrivalsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="min-w-[200px] flex-shrink-0 md:min-w-[220px]">
                  <CardSkeleton />
                </div>
              ))
            ) : (
              newArrivals.map((item, idx) => (
                <ScrollReveal
                  key={item.id}
                  delay={idx * 0.1}
                  direction="right"
                  distance={40}
                  className="min-w-[200px] max-w-[280px] flex-shrink-0 md:min-w-[220px]"
                >
                  <HomeProductCard product={item} />
                </ScrollReveal>
              ))
            )}
          </div>

          <div className="mt-8 flex justify-center md:hidden">
            <Link
              to="/collections"
              className="inline-flex items-center gap-1.5 border-b border-primary/30 pb-0.5 font-label-sm uppercase tracking-widest text-primary transition-all hover:border-primary"
            >
              {t("arrivals_shop_all_mobile")}
              <span className="material-symbols-outlined text-base rtl:rotate-180">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── BEST SELLERS ── */}
      <section className="py-20 md:py-section-gap section-divider">
        <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
          <ScrollReveal>
            <SectionHeader
              eyebrow={t("sellers_label")}
              title={t("sellers_title")}
              action={shopAll("sellers_shop_all")}
              actions={<ScrollArrows onScroll={handleBestSellersScroll} />}
              className="mb-12"
            />
          </ScrollReveal>

          <div
            ref={bestSellersScrollRef}
            className="hide-scrollbar -mx-4 flex gap-6 overflow-x-auto scroll-smooth px-4 pb-2"
          >
            {sellersLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="min-w-[240px] flex-shrink-0">
                  <CardSkeleton />
                </div>
              ))
            ) : (
              bestSellers.map((item, idx) => (
                <ScrollReveal
                  key={item.id}
                  delay={idx * 0.1}
                  direction="right"
                  distance={40}
                  className="min-w-[240px] max-w-[280px] flex-shrink-0"
                >
                  <Link to={`/product/${item.id}`} className="group block cursor-pointer">
                    <div className="relative mb-5 aspect-[3/4] overflow-hidden rounded-2xl bg-surface-container-low shadow-sm">
                      {item.image ? (
                        <img
                          src={safeSrc(item.image)}
                          alt={item.name}
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-surface-container-low text-secondary">
                          <span className="material-symbols-outlined text-3xl">image</span>
                        </div>
                      )}
                      <span className="absolute left-4 top-4 rounded-full bg-primary-container/25 px-3 py-1.5 text-[10px] font-label-sm uppercase tracking-widest text-on-background backdrop-blur-sm">
                        {t("sellers_badge")}
                      </span>
                    </div>
                    <div className="text-center">
                      <h3 className="mb-1 font-headline-sm text-lg text-on-surface transition-colors group-hover:text-primary">
                        {item.name}
                      </h3>
                      <p className="font-label-md text-on-surface-variant">
                        {formatDZD(item.sale_price || item.price)}
                      </p>
                    </div>
                  </Link>
                </ScrollReveal>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── MOOD BOARD ── */}
      <section className="overflow-hidden bg-surface-container-low py-20 md:py-section-gap">
        <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
          <ScrollReveal>
            <SectionHeader
              eyebrow={t("mood_label")}
              title={t("mood_title")}
              align="center"
              className="mb-14"
            />
          </ScrollReveal>

          {/* The tiles are revealed one by one, alternating up and down, so the
              wall assembles rather than appearing all at once. */}
          <div className="grid auto-rows-[150px] grid-cols-2 gap-3 md:auto-rows-[200px] md:grid-cols-4 md:gap-4">
            {moodImages.map((img, idx) => (
              <ScrollReveal
                key={idx}
                delay={idx * 0.08}
                direction={idx % 2 === 0 ? "up" : "down"}
                distance={30}
                className={img.className}
              >
                <div className="group h-full cursor-pointer overflow-hidden rounded-xl">
                  <img
                    src={img.src}
                    alt={`Mood ${idx + 1}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110"
                  />
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── REVIEWS ── */}
      <section className="py-20 md:py-section-gap section-divider">
        <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
          <ScrollReveal>
            <SectionHeader
              eyebrow={t("reviews_label")}
              title={t("reviews_title")}
              description={t("reviews_desc")}
              align="center"
              className="mb-14"
            />
          </ScrollReveal>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
            {testimonials.map((item, idx) => (
              <ScrollReveal key={item.name} delay={idx * 0.15} direction="up" distance={40}>
                <TestimonialCard quote={item.quote} name={item.name} image={item.image} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── INSTAGRAM ── */}
      <section className="bg-surface-container-low py-20 md:py-section-gap">
        <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
          <ScrollReveal>
            <SectionHeader
              eyebrow={t("instagram_label")}
              title="@DL.ACCESSORIES"
              action={
                <a
                  href="https://www.instagram.com/dl.accessoires.reghaia/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-quiet hidden font-label-sm uppercase tracking-widest text-primary md:inline-flex md:items-center md:gap-2"
                >
                  {t("follow_us")}
                  <span className="material-symbols-outlined text-base">open_in_new</span>
                </a>
              }
              className="mb-12"
            />
          </ScrollReveal>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 lg:grid-cols-6">
            {instagramImages.map((src, idx) => (
              <ScrollReveal key={idx} delay={idx * 0.06} direction="up" distance={20}>
                <a
                  href="https://www.instagram.com/dl.accessoires.reghaia/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block aspect-square overflow-hidden rounded-xl bg-surface-container-low"
                >
                  <img
                    src={src}
                    alt={`Instagram ${idx + 1}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/25 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
                    <span className="material-symbols-outlined text-3xl text-white drop-shadow-lg">
                      favorite
                    </span>
                  </div>
                </a>
              </ScrollReveal>
            ))}
          </div>

          <div className="mt-8 flex justify-center md:hidden">
            <a
              href="https://www.instagram.com/dl.accessoires.reghaia/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border-b border-primary/30 pb-0.5 font-label-sm uppercase tracking-widest text-primary transition-all hover:border-primary"
            >
              {t("follow_us")} @DL.ACCESSORIES
              <span className="material-symbols-outlined text-base">open_in_new</span>
            </a>
          </div>
        </div>
      </section>

    </div>
    </PageTransition>
  );
};

export default Home;
