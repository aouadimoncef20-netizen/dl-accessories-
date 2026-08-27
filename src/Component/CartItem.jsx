import { formatDZD } from "../lib/currency";

function CartItem({ id, name, image, price, variant, qty, onUpdateQty, onRemove }) {
  return (
    <div className="item-row flex flex-col sm:flex-row gap-4 sm:gap-6 pb-8 border-b border-outline-variant/30 group">
      <div className="w-full sm:w-32 h-40 bg-surface-container-low rounded-xl overflow-hidden flex-shrink-0 soft-glow">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
      </div>
      <div className="flex-grow flex flex-col justify-between py-2">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
          <div className="flex-1">
            <h3 className="font-headline-sm text-headline-sm mb-1">{name}</h3>
            <p className="text-on-surface-variant font-label-md mb-2">{variant}</p>
          </div>
          <span className="font-headline-sm text-headline-sm sm:text-right">{formatDZD(price)}</span>
        </div>
        <div className="flex justify-between items-end mt-3 sm:mt-0">
          <div className="flex items-center bg-surface-container rounded-full px-3 py-1 gap-4 border border-outline-variant/20">
            <button
              onClick={() => onUpdateQty(id, qty - 1)}
              className="hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">remove</span>
            </button>
            <span className="font-label-md w-4 text-center">{qty}</span>
            <button
              onClick={() => onUpdateQty(id, qty + 1)}
              className="hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
          </div>
          <button
            onClick={() => onRemove(id)}
            className="remove-btn opacity-40 hover:opacity-100 text-on-surface-variant flex items-center gap-1 transition-all duration-300"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            <span className="font-label-sm">Remove</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default CartItem;
