"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

interface PartySizePickerProps {
  value: number;
  onChange: (size: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export function PartySizePicker({
  value,
  onChange,
  min = 1,
  max = 20,
  className = "",
}: PartySizePickerProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);

  const quickSizes = [1, 2, 3, 4];

  const handleQuickSelect = (size: number) => {
    setShowCustomInput(false);
    onChange(size);
  };

  const handleCustomClick = () => {
    setShowCustomInput(true);
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
      if (value + 1 > 4) {
        setShowCustomInput(true);
      }
    }
  };

  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
      if (value - 1 <= 4) {
        setShowCustomInput(false);
      }
    }
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Quick size buttons */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {quickSizes.map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => handleQuickSelect(size)}
            className={`
              w-12 h-12 rounded-full font-semibold text-sm
              transition-all duration-200
              ${
                value === size && !showCustomInput
                  ? "bg-black text-white scale-110"
                  : "bg-white text-black border-2 border-gray-300 hover:border-gray-400 hover:scale-105"
              }
            `}
          >
            {size}
          </button>
        ))}
      </div>
      {/* Custom size controls */}
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className={`
            w-12 h-12 rounded-full border-2 border-gray-300
            flex items-center justify-center
            transition-all duration-200
            ${
              value <= min
                ? "opacity-40 cursor-not-allowed"
                : "hover:border-gray-400 hover:scale-105 active:scale-95"
            }
          `}
        >
          <Minus className="w-5 h-5" />
        </button>

        {showCustomInput || value > 6 ? (
          <div className="w-32 h-12 rounded-full bg-black text-white flex items-center justify-center">
            <span className="font-semibold text-lg">{value}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleCustomClick}
            className="
              w-32 h-12 rounded-full bg-black text-white font-semibold
              hover:bg-gray-800 transition-all duration-200
              hover:scale-105 active:scale-95 active:bg-black
            "
          >
            {value}
          </button>
        )}

        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          className={`
            w-12 h-12 rounded-full border-2 border-gray-300
            flex items-center justify-center
            transition-all duration-200
            ${
              value >= max
                ? "opacity-40 cursor-not-allowed"
                : "hover:border-gray-400 hover:scale-105 active:scale-95"
            }
          `}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Current selection display */}
      <p className="text-center text-sm text-gray-600">
        {value} {value === 1 ? "persona" : "personas"}
      </p>
    </div>
  );
}
