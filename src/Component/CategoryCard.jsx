import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function CategoryCard({ name, image, link }) {
  const target = link ?? `/collections?cat=${name.toLowerCase()}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
    <Link to={target} className="group cursor-pointer block">
      <div className="aspect-square bg-surface-container-low rounded-full flex items-center justify-center mb-4 transition-all group-hover:bg-primary-container/30 overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
      </div>
      <p className="text-center font-label-md text-on-surface uppercase text-xs tracking-widest">
        {name}
      </p>
    </Link>
    </motion.div>
  );
}
