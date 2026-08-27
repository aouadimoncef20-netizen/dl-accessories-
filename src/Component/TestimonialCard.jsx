function TestimonialCard({ quote, name, image, verified = true }) {
  return (
    <div className="bg-white p-6 md:p-10 rounded-2xl shadow-sm ambient-glow">
      {/* Stars */}
      <div className="flex gap-1 mb-6 text-primary-container">
        {[...Array(5)].map((_, i) => (
          <span key={i} className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>
            star
          </span>
        ))}
      </div>
      <p className="font-body-md text-on-surface italic mb-8">"{quote}"</p>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary-container">
          <img src={image} alt={name} loading="lazy" className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="font-label-md text-sm">{name}</p>
          {verified && <p className="text-xs text-secondary">Verified Buyer</p>}
        </div>
      </div>
    </div>
  );
}

export default TestimonialCard;
