'use client';

interface FrameData {
  frameNumber: number;
  data: string;
  size: number;
}

interface FrameDisplayProps {
  currentFrame: number;
  currentFrameData: FrameData | null;
  isLoadingFrames: boolean;
  loadingError: string | null;
  isFrameFlagged: boolean;
}

export default function FrameDisplay({
  currentFrame,
  currentFrameData,
  isLoadingFrames,
  loadingError,
  isFrameFlagged
}: FrameDisplayProps) {
  return (
    <div className="bg-black rounded-lg overflow-hidden shadow-lg mb-4 relative">
      {/* Flag indicator */}
      {isFrameFlagged && (
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
            FLAGGED
          </div>
        </div>
      )}
      
      <div className="relative">
        <div 
          className="bg-gray-900 flex items-center justify-center"
          style={{
            width: 'min(80vw, 60vh * 16/9)',
            height: 'min(60vh, 80vw * 9/16)'
          }}
        >
          {loadingError ? (
            <div className="text-white text-center">
              <div className="text-4xl mb-2">❌</div>
              <div className="text-base">Error Loading Frames</div>
              <div className="text-xs text-gray-400 mt-1">
                {loadingError}
              </div>
            </div>
          ) : isLoadingFrames ? (
            <div className="text-white text-center">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mb-2 mx-auto"></div>
              <div className="text-base">Loading Frames...</div>
              <div className="text-xs text-gray-400 mt-1">
                Please wait while we load all frames
              </div>
            </div>
          ) : currentFrameData ? (
            <img 
              src={currentFrameData.data}
              alt={`Frame ${currentFrame}`}
              className="max-w-full max-h-full object-contain"
              style={{ imageRendering: 'auto' }}
            />
          ) : (
            <div className="text-white text-center">
              <div className="text-4xl mb-2">🎥</div>
              <div className="text-base">No Frame Data</div>
              <div className="text-xs text-gray-400 mt-1">
                Frame {currentFrame} not found
              </div>
            </div>
          )}
        </div>
        
        <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
          Frame {currentFrame}
        </div>
      </div>
    </div>
  );
} 