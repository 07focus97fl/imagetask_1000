'use client';

import { useState } from 'react';

interface FrameJumperProps {
  currentFrame: number;
  totalFrames: number;
  onFrameJump: (frameNumber: number) => void;
  disabled?: boolean;
}

export default function FrameJumper({
  currentFrame,
  totalFrames,
  onFrameJump,
  disabled = false
}: FrameJumperProps) {
  const [inputValue, setInputValue] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const frameNumber = parseInt(inputValue);
    
    if (!isNaN(frameNumber) && frameNumber >= 1 && frameNumber <= totalFrames) {
      onFrameJump(frameNumber);
      setInputValue('');
      setIsInputFocused(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers
    if (value === '' || /^\d+$/.test(value)) {
      setInputValue(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent the workspace keyboard shortcuts when typing in the input
    e.stopPropagation();
    
    if (e.key === 'Escape') {
      setInputValue('');
      setIsInputFocused(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-xs text-gray-500">Go to:</span>
      <form onSubmit={handleSubmit} className="flex items-center space-x-1">
        <input
          type="text"
          value={isInputFocused ? inputValue : ''}
          onChange={handleInputChange}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => {
            if (inputValue === '') {
              setIsInputFocused(false);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={isInputFocused ? `1-${totalFrames}` : currentFrame.toString()}
          disabled={disabled}
          className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={disabled || !inputValue || inputValue === currentFrame.toString()}
          className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Go
        </button>
      </form>
    </div>
  );
} 