'use client';

interface FrameNavigationProps {
  currentFrame: number;
  totalFrames: number;
  isLoadingFrames: boolean;
  onFrameChange: (frame: number) => void;
  disabled?: boolean;
}

export default function FrameNavigation({
  currentFrame,
  totalFrames,
  isLoadingFrames,
  onFrameChange,
  disabled = false
}: FrameNavigationProps) {
  return (
    <div className="flex items-center space-x-4">
      <button
        onClick={() => onFrameChange(Math.max(1, currentFrame - 1))}
        disabled={currentFrame <= 1 || isLoadingFrames || disabled}
        className="p-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <span className="text-base font-medium">
        {currentFrame} / {totalFrames || '...'}
      </span>
      
      <button
        onClick={() => onFrameChange(Math.min(totalFrames, currentFrame + 1))}
        disabled={currentFrame >= totalFrames || isLoadingFrames || disabled}
        className="p-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
} 