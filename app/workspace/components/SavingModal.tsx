'use client';

interface SavingModalProps {
  isOpen: boolean;
}

export default function SavingModal({ isOpen }: SavingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Saving Changes</h3>
        <p className="text-sm text-gray-600">
          Please wait while we save your categorizations...
        </p>
        <div className="mt-4 text-xs text-gray-500">
          Do not close this window or navigate away
        </div>
      </div>
    </div>
  );
} 