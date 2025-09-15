'use client';

import { useState } from 'react';

interface BatchCategorizerProps {
  totalFrames: number;
  onBatchCategorize: (startFrame: number, endFrame: number, category: string, side: 'left' | 'right' | 'both') => void;
  disabled?: boolean;
}

export default function BatchCategorizer({
  totalFrames,
  onBatchCategorize,
  disabled = false
}: BatchCategorizerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rangeInput, setRangeInput] = useState('');
  const [category, setCategory] = useState('0');
  const [side, setSide] = useState<'left' | 'right' | 'both'>('both');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Parse the range input (e.g., "1-100", "50-75", "200")
    const rangeMatch = rangeInput.match(/^(\d+)(?:-(\d+))?$/);
    
    if (!rangeMatch) {
      setError('Invalid format. Use "1-100" or "50" for single frame');
      return;
    }

    const startFrame = parseInt(rangeMatch[1]);
    const endFrame = rangeMatch[2] ? parseInt(rangeMatch[2]) : startFrame;

    // Validate range
    if (startFrame < 1 || startFrame > totalFrames) {
      setError(`Start frame must be between 1 and ${totalFrames}`);
      return;
    }

    if (endFrame < 1 || endFrame > totalFrames) {
      setError(`End frame must be between 1 and ${totalFrames}`);
      return;
    }

    if (startFrame > endFrame) {
      setError('Start frame must be less than or equal to end frame');
      return;
    }

    // Confirm large batch operations
    const frameCount = endFrame - startFrame + 1;
    const sideCount = side === 'both' ? 2 : 1;
    const totalChanges = frameCount * sideCount;

    if (totalChanges > 50) {
      const confirmed = window.confirm(
        `This will categorize ${totalChanges} frame sides (frames ${startFrame}-${endFrame}, ${side}) as category ${category}. Continue?`
      );
      if (!confirmed) return;
    }

    // Apply the batch categorization
    onBatchCategorize(startFrame, endFrame, category, side);
    
    // Reset form
    setRangeInput('');
    setCategory('0');
    setSide('both');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent workspace keyboard shortcuts when typing
    e.stopPropagation();
    
    if (e.key === 'Escape') {
      setIsOpen(false);
      setError('');
    }
  };

  return (
    <div className="relative">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          disabled={disabled}
          className="px-3 py-1 text-xs bg-purple-100 text-purple-700 border border-purple-300 rounded hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Batch categorize multiple frames"
        >
          Batch
        </button>
      ) : (
        <div className="absolute bottom-full mb-2 right-0 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-10 min-w-80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Batch Categorize</h3>
            <button
              onClick={() => {
                setIsOpen(false);
                setError('');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Frame Range
              </label>
              <input
                type="text"
                value={rangeInput}
                onChange={(e) => setRangeInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., 1-100 or 50"
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                autoFocus
              />
              <div className="text-xs text-gray-500 mt-1">
                Single frame: &quot;50&quot; | Range: &quot;1-100&quot; | Max: {totalFrames}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  {Array.from({ length: 10 }, (_, i) => (
                    <option key={i} value={i.toString()}>
                      {i} - {['All Good', 'Partial Frame', 'Full Cover', 'Partial Cover', 'Tilt', 'Drinking', 'Eating', 'Yawning', 'Weird Face', 'End'][i]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Apply to
                </label>
                <select
                  value={side}
                  onChange={(e) => setSide(e.target.value as 'left' | 'right' | 'both')}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="both">Both Sides</option>
                  <option value="left">Left Side Only</option>
                  <option value="right">Right Side Only</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setError('');
                }}
                className="px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!rangeInput}
                className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
} 