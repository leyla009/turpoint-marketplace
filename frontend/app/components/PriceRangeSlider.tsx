'use client';

interface PriceRangeSliderProps {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChangeMin: (value: number) => void;
  onChangeMax: (value: number) => void;
}

// Dual-handle drag slider with no external dependency - two overlapping
// native <input type="range"> elements sharing one track. Each input has
// pointer-events disabled everywhere except its own thumb (restored via
// the ::-webkit-slider-thumb/::-moz-range-thumb rules in globals.css), so
// both handles stay independently draggable no matter which one is on top
// in the stacking order.
export default function PriceRangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  onChangeMin,
  onChangeMax,
}: PriceRangeSliderProps) {
  const range = Math.max(max - min, 1);
  const leftPct = ((valueMin - min) / range) * 100;
  const rightPct = ((valueMax - min) / range) * 100;

  return (
    <div className="relative h-5 flex items-center">
      <div className="absolute inset-x-0 h-1.5 bg-border rounded-full" />
      <div
        className="absolute h-1.5 bg-primary rounded-full"
        style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        value={valueMin}
        onChange={(e) => onChangeMin(Math.min(Number(e.target.value), valueMax))}
        className="range-thumb absolute inset-x-0 w-full m-0 appearance-none bg-transparent pointer-events-none"
        aria-label="Minimum price"
      />
      <input
        type="range"
        min={min}
        max={max}
        value={valueMax}
        onChange={(e) => onChangeMax(Math.max(Number(e.target.value), valueMin))}
        className="range-thumb absolute inset-x-0 w-full m-0 appearance-none bg-transparent pointer-events-none"
        aria-label="Maximum price"
      />
    </div>
  );
}
