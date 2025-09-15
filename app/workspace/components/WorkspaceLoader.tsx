'use client';

interface WorkspaceLoaderProps {
  loadingSteps: {
    frames: boolean;
    categorizations: boolean;
    conversationData: boolean;
  };
}

export default function WorkspaceLoader({ loadingSteps }: WorkspaceLoaderProps) {
  const steps = [
    { key: 'conversationData', label: 'Loading conversation data...', completed: !loadingSteps.conversationData },
    { key: 'frames', label: 'Loading frames...', completed: !loadingSteps.frames },
    { key: 'categorizations', label: 'Loading categorizations...', completed: !loadingSteps.categorizations },
  ];

  const completedSteps = steps.filter(step => step.completed).length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  return (
    <div className="h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Workspace</h2>
          <p className="text-gray-600">Please wait while we prepare your coding environment...</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{completedSteps}/{totalSteps}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Loading Steps */}
        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.key} className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                step.completed 
                  ? 'bg-green-500' 
                  : loadingSteps[step.key as keyof typeof loadingSteps]
                    ? 'bg-blue-500'
                    : 'bg-gray-300'
              }`}>
                {step.completed && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-sm ${
                step.completed 
                  ? 'text-green-600 font-medium' 
                  : loadingSteps[step.key as keyof typeof loadingSteps]
                    ? 'text-blue-600'
                    : 'text-gray-500'
              }`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Estimated time */}
        <div className="mt-6 text-center text-xs text-gray-500">
          This usually takes 10-15 seconds
        </div>
      </div>
    </div>
  );
} 