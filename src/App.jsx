import { Routes, Route } from "react-router-dom";

import Home from "./Pages/Home";
import Shop from "./Pages/Shop";
import Collections from "./Pages/Collections";
import ProductDetails from "./Pages/ProductDetails";
import Cart from "./Pages/Cart";
import Checkout from "./Pages/Checkout";
import Contact from "./Pages/Contact";
import About from "./Pages/About";
import Gallery from "./Pages/Gallery";
import Wishlist from "./Pages/Wishlist";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="/collections" element={<Collections />} />
      <Route path="/product/:id" element={<ProductDetails />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/about" element={<About />} />
      <Route path="/gallery" element={<Gallery />} />
      <Route path="/wishlist" element={<Wishlist />} />
    </Routes>
  );
}

export default App;