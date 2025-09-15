'use client';

import { useState, useEffect } from 'react';

interface User {
  id: number;
  display_name: string;
  role: 'admin' | 'coder';
}

interface ConversationStatusProps {
  conversationId: number;
  firstPassCompleted: boolean;
  secondPassCompleted: boolean;
  finalPassLocked: boolean;
  inProgressBy: User | null;
  currentUser: User;
  onStatusUpdate: (update: {
    first_pass_completed?: boolean;
    second_pass_completed?: boolean;
    final_pass_locked?: boolean;
    in_progress_by?: number | null;
  }) => void;
}

export default function ConversationStatus({
  firstPassCompleted,
  secondPassCompleted,
  finalPassLocked,
  inProgressBy,
  currentUser,
  onStatusUpdate
}: ConversationStatusProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Local state for optimistic updates
  const [localFirstPass, setLocalFirstPass] = useState(firstPassCompleted);
  const [localSecondPass, setLocalSecondPass] = useState(secondPassCompleted);
  const [localLocked, setLocalLocked] = useState(finalPassLocked);
  const [localInProgressBy, setLocalInProgressBy] = useState(inProgressBy);

  // Sync local state with props when they change
  useEffect(() => {
    setLocalFirstPass(firstPassCompleted);
    setLocalSecondPass(secondPassCompleted);
    setLocalLocked(finalPassLocked);
    setLocalInProgressBy(inProgressBy);
  }, [firstPassCompleted, secondPassCompleted, finalPassLocked, inProgressBy]);

  const isInProgressByCurrentUser = localInProgressBy?.id === currentUser.id;
  const isInProgressByOtherUser = localInProgressBy && localInProgressBy.id !== currentUser.id;

  const handleStatusChange = async (update: Parameters<typeof onStatusUpdate>[0]) => {
    setIsUpdating(true);
    
    // Optimistic updates
    if (update.first_pass_completed !== undefined) {
      setLocalFirstPass(update.first_pass_completed);
    }
    if (update.second_pass_completed !== undefined) {
      setLocalSecondPass(update.second_pass_completed);
    }
    if (update.final_pass_locked !== undefined) {
      setLocalLocked(update.final_pass_locked);
    }
    if (update.in_progress_by !== undefined) {
      setLocalInProgressBy(update.in_progress_by ? currentUser : null);
    }
    
    try {
      await onStatusUpdate(update);
    } catch (error) {
      // Revert optimistic updates on error
      setLocalFirstPass(firstPassCompleted);
      setLocalSecondPass(secondPassCompleted);
      setLocalLocked(finalPassLocked);
      setLocalInProgressBy(inProgressBy);
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInProgressToggle = () => {
    if (isInProgressByCurrentUser) {
      // Remove in-progress status
      handleStatusChange({ in_progress_by: null });
    } else if (!isInProgressByOtherUser) {
      // Claim in-progress status
      handleStatusChange({ in_progress_by: currentUser.id });
    }
  };

  const getCurrentStatusValue = () => {
    if (localLocked) return 'locked';
    if (localSecondPass) return 'second_pass';
    if (localFirstPass) return 'first_pass';
    return 'not_started';
  };

  const handleStatusDropdownChange = (value: string) => {
    switch (value) {
      case 'first_pass':
        handleStatusChange({
          first_pass_completed: true,
          second_pass_completed: false,
          final_pass_locked: false
        });
        break;
      case 'second_pass':
        handleStatusChange({
          first_pass_completed: true,
          second_pass_completed: true,
          final_pass_locked: false
        });
        break;
      case 'locked':
        if (currentUser.role === 'admin') {
          handleStatusChange({
            first_pass_completed: true,
            second_pass_completed: true,
            final_pass_locked: true
          });
        }
        break;
      case 'unlock':
        if (currentUser.role === 'admin') {
          // Unlock but keep the second pass completed status
          handleStatusChange({
            first_pass_completed: true,
            second_pass_completed: true,
            final_pass_locked: false
          });
        }
        break;
      case 'not_started':
        handleStatusChange({
          first_pass_completed: false,
          second_pass_completed: false,
          final_pass_locked: false
        });
        break;
    }
  };

  return (
    <div className="flex items-center space-x-4">
      {/* Status Dropdown */}
      <select
        value={getCurrentStatusValue()}
        onChange={(e) => handleStatusDropdownChange(e.target.value)}
        disabled={isUpdating}
        className="px-2 py-1 border border-gray-300 rounded text-xs disabled:opacity-50"
      >
        <option value="not_started">Not Started</option>
        <option value="first_pass">First Pass Complete</option>
        <option value="second_pass">Second Pass Complete</option>
        {currentUser.role === 'admin' && (
          <>
            <option value="locked">Locked</option>
            {localLocked && (
              <option value="unlock">🔓 Unlock</option>
            )}
          </>
        )}
      </select>

      {/* In Progress Checkbox - disabled when locked unless admin */}
      <label className="flex items-center space-x-1 text-xs">
        <input
          type="checkbox"
          checked={isInProgressByCurrentUser}
          onChange={handleInProgressToggle}
          disabled={
            isUpdating || 
            isInProgressByOtherUser || 
            (localLocked && currentUser.role !== 'admin')
          }
          className="w-3 h-3 disabled:opacity-50"
        />
        <span className={`${
          isInProgressByOtherUser 
            ? 'text-orange-600' 
            : isInProgressByCurrentUser 
              ? 'text-blue-600' 
              : localLocked && currentUser.role !== 'admin'
                ? 'text-gray-400'
                : 'text-gray-600'
        }`}>
          {isInProgressByOtherUser 
            ? `In Progress (${localInProgressBy!.display_name})`
            : isInProgressByCurrentUser
              ? 'In Progress (You)'
              : localLocked && currentUser.role !== 'admin'
                ? 'Locked'
                : 'In Progress'
          }
        </span>
      </label>

      {/* Status indicator for locked conversations */}
      {localLocked && (
        <span className="text-xs text-red-600 font-medium flex items-center">
          🔒 Locked
          {currentUser.role === 'admin' && (
            <span className="text-gray-500 ml-1">(Admin can unlock)</span>
          )}
        </span>
      )}

      {/* Loading indicator */}
      {isUpdating && (
        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      )}
    </div>
  );
} 