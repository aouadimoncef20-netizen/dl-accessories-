import { useState } from "react";
import { Link } from "react-router-dom";
import useCartStore from "../stores/cartStore";
import PageTransition from "../Component/PageTransition";
import CartItem from "../Component/CartItem";
import OrderSummary from "../Component/OrderSummary";

const complementaryProducts = [
  {
    name: "Aura Gold Cuff",
    price: 85.0,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDisU9TrG_0TOTOYsAYexa5f06QKAvUFKWh2c0aD1XXiwzbyRvdmHLKAA9wwDaCe9aQoGw9mBqaSn6dPM77794fhHNEcauRhEbYD-qqkbsO45yYE7EXCqcH6YW8mlXzwajBZ_9-XjomTUp829DyDUITQBqbYdx3EeNj1uZ-AxTyuG7_dIKEsv-ElARF5r0XkOH4uJol69Ea4hvFC8F2nfmI7Nluu1vTRN4vL878cTDpRMywvTu415JV",
  },
  {
    name: "Silk Flutter Lashes",
    price: 32.0,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBumkWHjy5_KenGu0ka3efppYXGrnhZ3QMvqG-ssFai2YHI9_4OpdPa2Ho50I6nnUwUXecTsR2RL6PJR2nItUaQRHn5JTHg6VVQ3pC524YYnoJovhf9pLMZK_FvrN4jmEnrrR-5iVOKyIilQaKRM5aC8OtUO9fdKc_exJNOKsOYOPszTsN81a5igeW_HchOo-NaaYfadF4fAXRR361bD95k0iIM_BG5Aiq4c4X9X8mHzJxpWx6RywdS",
  },
  {
    name: "Petite Diamond Chain",
    price: 210.0,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDbR6a8HuJkOA82D_WX4lnd2eLp7uOVnFWZaWyL4y5H84av6keDU5R4kg_cYP3jICLxLkEY1NGe0KSTfAVNzR4ZS6Ht0BzWmxw-c-k1H5jcFmA7MNzNdkMNZQ2tbsa4ReWMwgE989sSFvW5WA1ShsmVkHCM-g7AzPliNSVqa0s_RvK5MJHz-lI0d35_hoYmz-x6U_JRsu-F5I8gNsG0WgZQolIQFOPkBs8_tdIwl9BW7QtgD1iIICUC",
  },
];

const defaultItems = [
  {
    id: "watch-1",
    name: "Ethereal Rose Gold Watch",
    price: 185.0,
    variant: "Color: Champagne Blush / One Size",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAf3PD6iqCg4HCzGwiFlH2EK__QarU6nXvOTpu8TMsa5ibC5dxoCjQzG4DgtiVsAqcheGDK3ZwChvKBhzZLkkKaHviSYtgxahHOtSCccWBsxnU6UgvM7cn9LfZ0UoJBT_GRNE5KwRtB6-ycQK7Ij0yN8HiHiB7brzJN2tM7Z8S4nd-AtGeH4wTumNxOa_V-b6mKUTviAUTL8cAtoszmoJ_jY4AgvXpoKxdRWsIluUebhp3AwnNte7ry",
  },
  {
    id: "earrings-1",
    name: "Luna Pearl Hoops",
    price: 120.0,
    variant: "Material: 18k Gold Plated / Freshwater Pearl",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB-RT79BVzHd0AW1bIQuGt59bukCqH7VsFRn5T2VDR8NhOcAlljlmCNS_npKeQzUe4aTIttzXD4s1wSZRkQploYOUij9FzijAfcxpQdLLY7fnBIPZ6-8_TkwfkIFw1QokAAcfIRVpeQV2_oWwcEaURhAZcn0LHOt9-8Mfklngt_wYu4K7cDevgverU58WdF_XF8TecseodyqiGwEriFm5XYVWMBmTUePekY0UbpfHzrHTJdVtCoaGby",
  },
];

function Cart() {
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQty = useCartStore((s) => s.updateQty);
  const subtotal = useCartStore((s) => s.subtotal());
  const displayItems = items.length > 0 ? items : defaultItems;
  const displaySubtotal = items.length > 0 ? subtotal : 305.0;
  const [giftWrap, setGiftWrap] = useState(false);

  const handleAddComplementary = (product) => {
    addItem({ id: product.name.toLowerCase().replace(/\s+/g, "-"), ...product });
  };

  return (
    <PageTransition>
    <div className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      {/* Header */}
      <div className="mb-12">
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-2">
          Shopping Bag
        </h1>
        <p className="text-on-surface-variant font-body-md">
          {displayItems.length} item{displayItems.length !== 1 ? "s" : ""} in
          your cart. Secure checkout is just a step away.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        {/* Left: Line Items */}
        <div className="lg:col-span-8 space-y-8">
          <div className="space-y-0">
            {displayItems.map((item) => (
              <CartItem
                key={item.id}
                id={item.id}
                name={item.name}
                image={item.image}
                price={item.price}
                variant={item.variant}
                qty={item.qty || 1}
                onUpdateQty={updateQty}
                onRemove={removeItem}
              />
            ))}
          </div>

          {/* Gift wrapping option */}
          <div className="bg-primary-container/20 p-4 md:p-6 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-primary-container/40">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-primary text-[28px] shrink-0">
                redeem
              </span>
              <div>
                <p className="font-label-md text-primary">Add Gift Wrapping</p>
                <p className="text-on-surface-variant text-label-sm">
                  Complimentary silk ribbon and luxury box.
                </p>
              </div>
            </div>
            <button
              onClick={() => setGiftWrap(!giftWrap)}
              className={`px-4 py-2 rounded-full font-label-sm border transition-all active:scale-95 ${
                giftWrap
                  ? "bg-primary text-white border-primary"
                  : "bg-white border-outline-variant/20 hover:shadow-sm"
              }`}
            >
              {giftWrap ? "Added ✓" : "Add"}
            </button>
          </div>
        </div>

        {/* Right: Order Summary */}
        <aside className="lg:col-span-4 space-y-6">
          <OrderSummary subtotal={displaySubtotal} />

          {/* Support card */}
          <div className="bg-surface-container p-6 rounded-xl flex flex-col items-center text-center">
            <p className="font-label-md mb-2">Need help with your order?</p>
            <p className="text-on-surface-variant text-label-sm mb-4">
              Our concierge is available Mon-Fri, 9am-6pm PST.
            </p>
            <Link
              to="/contact"
              className="text-primary font-label-md underline underline-offset-4 decoration-primary-container hover:text-on-primary-container transition-colors"
            >
              Contact Concierge
            </Link>
          </div>
        </aside>
      </div>

      {/* Complementary Items */}
      <section className="mt-section-gap">
        <h2 className="font-display-lg text-display-lg-mobile mb-8">
          You might also love
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {complementaryProducts.map((prod, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-xl bg-surface-container-low p-6 soft-glow"
            >
              <div className="aspect-[4/5] rounded-lg overflow-hidden mb-4">
                <img
                  src={prod.image}
                  alt={prod.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                />
              </div>
              <h4 className="font-headline-sm text-headline-sm mb-1">
                {prod.name}
              </h4>
              <p className="text-on-surface-variant font-label-md mb-4">
                ${prod.price.toFixed(2)}
              </p>
              <button
                onClick={() => handleAddComplementary(prod)}
                className="w-full py-3 rounded-full border border-primary text-primary font-label-sm group-hover:bg-primary group-hover:text-white transition-all"
              >
                Add to Bag
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
    </PageTransition>
  );
}

export default Cart;
