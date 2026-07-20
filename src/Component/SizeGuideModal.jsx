function SizeGuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-3xl p-8 md:p-12 max-w-lg w-full max-h-[80vh] overflow-y-auto custom-scrollbar shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="font-headline-md text-headline-md">Ring Size Guide</h2>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-surface-container rounded-full transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-8">
          <div>
            <h3 className="font-label-md uppercase tracking-widest mb-4">Standard US Sizes</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { size: "4", mm: "14.8mm", guide: "Tiny / Child" },
                { size: "5", mm: "15.7mm", guide: "Small / Petite" },
                { size: "6", mm: "16.5mm", guide: "Average / Slim" },
                { size: "7", mm: "17.3mm", guide: "Average / Medium" },
                { size: "8", mm: "18.1mm", guide: "Large / Wide" },
              ].map((s) => (
                <div key={s.size} className="bg-surface-container-low rounded-xl p-4 text-center">
                  <p className="font-display-lg text-display-lg-mobile text-primary">{s.size}</p>
                  <p className="font-label-sm text-secondary">{s.mm}</p>
                  <p className="text-label-sm text-on-surface-variant mt-1">{s.guide}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-primary-container/20 rounded-xl p-6">
            <h3 className="font-label-md uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">lightbulb</span>
              How to Measure
            </h3>
            <ol className="space-y-2 font-body-md text-secondary list-decimal list-inside">
              <li>Wrap a piece of string or paper around your finger.</li>
              <li>Mark where the ends meet and measure the length in mm.</li>
              <li>Divide by 3.14 to get the diameter.</li>
              <li>Match your diameter to the chart above.</li>
            </ol>
          </div>

          <button
            onClick={onClose}
            className="w-full py-4 bg-primary text-on-primary rounded-full font-label-md uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export default SizeGuideModal;
