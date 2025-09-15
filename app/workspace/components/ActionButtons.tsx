'use client';

interface ActionButtonsProps {
  isFrameFlagged: boolean;
  frameHasNote: boolean;
  conversationNote: string;
  onFlagForReview: () => void;
  onImageNote: () => void;
  onConversationNote: () => void;
  disabled?: boolean;
}

export default function ActionButtons({
  isFrameFlagged,
  frameHasNote,
  conversationNote,
  onFlagForReview,
  onImageNote,
  onConversationNote,
  disabled = false
}: ActionButtonsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <button
        onClick={onFlagForReview}
        disabled={disabled}
        className={`flex items-center space-x-1 px-3 py-1 border rounded hover:bg-gray-50 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isFrameFlagged 
            ? 'border-red-500 bg-red-50 text-red-700' 
            : 'border-gray-300'
        }`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 2H21l-3 6 3 6h-8.5l-1-2H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
        <span>{isFrameFlagged ? 'Unflag' : 'Flag for Review'}</span>
      </button>
      
      <button
        onClick={onImageNote}
        disabled={disabled}
        className={`flex items-center space-x-1 px-3 py-1 border rounded hover:bg-gray-50 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          frameHasNote 
            ? 'border-blue-500 bg-blue-50 text-blue-700' 
            : 'border-gray-300'
        }`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>Image Note</span>
      </button>
      
      <button
        onClick={onConversationNote}
        disabled={disabled}
        className={`flex items-center space-x-1 px-3 py-1 border rounded hover:bg-gray-50 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          conversationNote.trim() 
            ? 'border-green-500 bg-green-50 text-green-700' 
            : 'border-gray-300'
        }`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span>Conversation Note</span>
      </button>
    </div>
  );
} 