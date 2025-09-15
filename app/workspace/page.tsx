'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import FrameDisplay from './components/FrameDisplay';
import FrameNavigation from './components/FrameNavigation';
import CodingInterface from './components/CodingInterface';
import ActionButtons from './components/ActionButtons';
import SaveStatusIndicator from './components/SaveStatusIndicator';
import NoteModal from './components/NoteModal';
import WorkspaceLoader from './components/WorkspaceLoader';
import SavingModal from './components/SavingModal';
import FrameJumper from './components/FrameJumper';
import BatchCategorizer from './components/BatchCategorizer';

interface FrameData {
  frameNumber: number;
  data: string;
  size: number;
  name: string;
  segment_id: number;
  segment_order: number;
  original_frame_number: number;
  leftFrameId: number | null;
  rightFrameId: number | null;
}

interface FramesResponse {
  success: boolean;
  totalFrames: number;
  frames: FrameData[];
  group: {
    group: string;
  };
}

interface CategorizationData {
  frame_id?: number;
  category: string;
  flagged: boolean;
  note: string | null;
}

interface SaveStatus {
  status: 'saved' | 'saving' | 'unsaved' | 'error';
  lastSaved?: Date;
  message?: string;
}

interface NoteModalState {
  isOpen: boolean;
  type: 'frame';
  title: string;
  note: string;
}

interface User {
  id: number;
  display_name: string;
}

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const group = searchParams.get('group');

  const [currentFrame, setCurrentFrame] = useState(1);
  const [leftCategory, setLeftCategory] = useState('0');
  const [rightCategory, setRightCategory] = useState('0');
  const [activeSide, setActiveSide] = useState<'left' | 'right'>('left');

  // Frame loading state
  const [frames, setFrames] = useState<FrameData[]>([]);
  const [totalFrames, setTotalFrames] = useState(0);
  const [isLoadingFrames, setIsLoadingFrames] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Categorization state
  const [categorizations, setCategorizations] = useState<{ [key: string]: CategorizationData }>({});
  const [unsavedChanges, setUnsavedChanges] = useState<{ [key: string]: CategorizationData }>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ status: 'saved' });
  const [isLoadingCategorizations, setIsLoadingCategorizations] = useState(true);

  // Note and flag state
  const [noteModal, setNoteModal] = useState<NoteModalState>({
    isOpen: false,
    type: 'frame',
    title: '',
    note: ''
  });

  // Manual save state
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // User data
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Check if everything is loaded
  const isFullyLoaded = !isLoadingFrames && !isLoadingCategorizations && !loadingError;

  const router = useRouter();

  // Get current frame data
  const getCurrentFrameData = useCallback(() => {
    if (frames.length === 0) return null;
    return frames.find(frame => frame.frameNumber === currentFrame - 1) || frames[0];
  }, [frames, currentFrame]);

  // Get current frame categorizations
  const getCurrentFrameCategorizations = useCallback(() => {
    const currentFrameData = getCurrentFrameData();
    if (!currentFrameData) return { leftCat: null, rightCat: null, leftKey: '', rightKey: '' };

    const leftKey = `frame_${currentFrameData.leftFrameId}_left`;
    const rightKey = `frame_${currentFrameData.rightFrameId}_right`;

    const leftCat = unsavedChanges[leftKey] || categorizations[leftKey];
    const rightCat = unsavedChanges[rightKey] || categorizations[rightKey];

    return { leftCat, rightCat, leftKey, rightKey };
  }, [getCurrentFrameData, unsavedChanges, categorizations]);

  // Check if current frame is flagged
  const isCurrentFrameFlagged = useCallback(() => {
    const { leftCat, rightCat } = getCurrentFrameCategorizations();
    return leftCat?.flagged || rightCat?.flagged || false;
  }, [getCurrentFrameCategorizations]);

  // Load user and group data
  useEffect(() => {
    if (!group) return;

    const loadData = async () => {
      try {
        // Load current user
        const userResponse = await fetch('/api/workspace/current-user');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setCurrentUser(userData.user);
        }

        // Load existing categorizations
        setIsLoadingCategorizations(true);
        const catResponse = await fetch(
          `/api/workspace/categorizations?group_id=${group}`
        );

        if (catResponse.ok) {
          const catData = await catResponse.json();
          console.log('Loaded categorizations:', catData.categorizations);
          console.log('Categorization keys from API:', Object.keys(catData.categorizations || {}));
          setCategorizations(catData.categorizations || {});
        }
        setIsLoadingCategorizations(false);

      } catch (error) {
        console.error('Error loading data:', error);
        setLoadingError(error instanceof Error ? error.message : 'Failed to load data');
      }
    };

    loadData();
  }, [group]);

  // Update UI when frame changes
  useEffect(() => {
    const { leftCat, rightCat, leftKey, rightKey } = getCurrentFrameCategorizations();
    console.log('Frame change - looking for keys:', { leftKey, rightKey });
    console.log('Found categorizations:', { leftCat, rightCat });
    setLeftCategory(leftCat?.category || '0');
    setRightCategory(rightCat?.category || '0');
  }, [currentFrame, categorizations, unsavedChanges]);

  // Update the unsaved changes tracking
  useEffect(() => {
    setHasUnsavedChanges(Object.keys(unsavedChanges).length > 0);
    if (Object.keys(unsavedChanges).length > 0) {
      setSaveStatus({ status: 'unsaved', message: `${Object.keys(unsavedChanges).length} unsaved changes` });
    } else {
      setSaveStatus({ status: 'saved', message: 'All changes saved' });
    }
  }, [unsavedChanges]);

  // Manual save function
  const handleManualSave = useCallback(async () => {
    if (!group || !currentUser || Object.keys(unsavedChanges).length === 0 || isSaving) return;

    setIsSaving(true);
    setSaveStatus({ status: 'saving', message: 'Saving changes...' });

    try {
      // Increase timeout for large batch operations
      const changeCount = Object.keys(unsavedChanges).length;
      const timeoutMs = Math.max(30000, changeCount * 100); // At least 30s, +100ms per change

      console.log(`Saving ${changeCount} changes with ${timeoutMs}ms timeout`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch('/api/workspace/categorizations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: group,
          changes: unsavedChanges,
          userId: currentUser.id
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const result = await response.json();

      if (result.success) {
        setCategorizations(prev => ({ ...prev, ...unsavedChanges }));
        setUnsavedChanges({});
        setSaveStatus({
          status: 'saved',
          lastSaved: new Date(),
          message: `Saved ${result.saved} changes successfully`
        });
      } else {
        setSaveStatus({
          status: 'error',
          message: `Save failed: ${result.saved}/${result.total} saved`
        });
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus({ status: 'error', message: 'Save failed - network error' });
    } finally {
      setIsSaving(false);
    }
  }, [group, currentUser, unsavedChanges, isSaving]);

  // Update categorization
  const updateCategorization = useCallback((side: 'left' | 'right', category: string) => {
    const currentFrameData = getCurrentFrameData();
    if (!currentFrameData) {
      console.log('No current frame data available - this is expected, creating default categorization');
      // Even without frame data, we should update the UI immediately
      if (side === 'left') {
        setLeftCategory(category);
      } else {
        setRightCategory(category);
      }
      return;
    }

    const frameId = side === 'left' ? currentFrameData.leftFrameId : currentFrameData.rightFrameId;
    console.log(`Updating ${side} side with category ${category}, frameId: ${frameId}`);

    if (!frameId) {
      console.log(`No ${side} frame ID available for categorization - updating UI only`);
      // Still update the UI even if we can't save to database yet
      if (side === 'left') {
        setLeftCategory(category);
      } else {
        setRightCategory(category);
      }
      return;
    }

    const key = `frame_${frameId}_${side}`;
    const existingCat = categorizations[key] || { category: '0', flagged: false, note: null };

    const newData = {
      ...existingCat,
      category,
      frame_id: frameId,
    };

    console.log(`Setting categorization for key: ${key}`, newData);

    setUnsavedChanges(prev => ({
      ...prev,
      [key]: newData
    }));

    if (side === 'left') {
      setLeftCategory(category);
    } else {
      setRightCategory(category);
    }
  }, [categorizations, getCurrentFrameData]);

  // Toggle flag for current frame
  const handleFlagForReview = () => {
    if (isSaving) return;

    const currentFrameData = getCurrentFrameData();
    if (!currentFrameData) return;

    const { leftCat, rightCat, leftKey, rightKey } = getCurrentFrameCategorizations();
    const isCurrentlyFlagged = leftCat?.flagged || rightCat?.flagged || false;
    const newFlaggedState = !isCurrentlyFlagged;

    const leftData = {
      category: leftCat?.category || '0',
      flagged: newFlaggedState,
      note: leftCat?.note || null,
      frame_id: currentFrameData.leftFrameId
    };

    const rightData = {
      category: rightCat?.category || '0',
      flagged: newFlaggedState,
      note: rightCat?.note || null,
      frame_id: currentFrameData.rightFrameId
    };

    setUnsavedChanges(prev => ({
      ...prev,
      [leftKey]: leftData,
      [rightKey]: rightData
    }));
  };

  // Handle image note
  const handleImageNote = () => {
    if (isSaving) return;

    const { leftCat, rightCat } = getCurrentFrameCategorizations();
    const currentNote = leftCat?.note || rightCat?.note || '';

    setNoteModal({
      isOpen: true,
      type: 'frame',
      title: `Frame ${currentFrame} Note`,
      note: currentNote
    });
  };

  // Handle note save
  const handleNoteSave = async (note: string) => {
    const { leftKey, rightKey, leftCat, rightCat } = getCurrentFrameCategorizations();

    const leftData = {
      category: leftCat?.category || '0',
      flagged: leftCat?.flagged || false,
      note
    };

    const rightData = {
      category: rightCat?.category || '0',
      flagged: rightCat?.flagged || false,
      note
    };

    setUnsavedChanges(prev => ({
      ...prev,
      [leftKey]: leftData,
      [rightKey]: rightData
    }));
  };

  // Load all frames when component mounts
  useEffect(() => {
    if (!group) {
      setLoadingError('Missing group parameter');
      setIsLoadingFrames(false);
      return;
    }

    const loadFrames = async () => {
      try {
        setIsLoadingFrames(true);
        setLoadingError(null);

        const response = await fetch(
          `/api/workspace/frames?group=${group}`
        );

        if (!response.ok) {
          throw new Error(`Failed to load frames: ${response.statusText}`);
        }

        const data: FramesResponse = await response.json();

        if (!data.success) {
          throw new Error('Failed to load frames from API');
        }

        const sortedFrames = data.frames.sort((a, b) => a.frameNumber - b.frameNumber);

        setFrames(sortedFrames);
        setTotalFrames(data.totalFrames);

        // Debug frame IDs
        console.log('Loaded frames with IDs:', sortedFrames.map(f => ({
          frameNumber: f.frameNumber,
          leftId: f.leftFrameId,
          rightId: f.rightFrameId,
          name: f.name
        })));

      } catch (error) {
        console.error('Error loading frames:', error);
        setLoadingError(error instanceof Error ? error.message : 'Unknown error loading frames');
      } finally {
        setIsLoadingFrames(false);
      }
    };

    loadFrames();
  }, [group]);

  // Keyboard handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (isSaving || noteModal.isOpen) {
      return;
    }

    console.log('Key pressed:', event.key, 'Active side:', activeSide);

    if (['ArrowLeft', 'ArrowRight', 'Tab', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(event.key)) {
      event.preventDefault();
    }

    if (event.key === 'ArrowLeft' && currentFrame > 1) {
      console.log('Moving to previous frame');
      setCurrentFrame(prev => prev - 1);
    } else if (event.key === 'ArrowRight' && currentFrame < totalFrames) {
      console.log('Moving to next frame');
      setCurrentFrame(prev => prev + 1);
    } else if (event.key === 'Tab') {
      console.log('Switching active side');
      setActiveSide(prev => prev === 'left' ? 'right' : 'left');
    } else if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(event.key)) {
      console.log(`Updating categorization: ${activeSide} side to category ${event.key}`);
      updateCategorization(activeSide, event.key);
    } else if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleManualSave();
    }
  }, [currentFrame, totalFrames, activeSide, updateCategorization, isSaving, handleManualSave, noteModal.isOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const currentFrameData = getCurrentFrameData();
  const isFrameFlagged = isCurrentFrameFlagged();
  const { leftCat, rightCat } = getCurrentFrameCategorizations();
  const frameHasNote = !!(leftCat?.note || rightCat?.note);

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/');
    }
  };

  // Update frame navigation to prevent during save
  const handleFrameChange = (newFrame: number) => {
    if (isSaving) return;
    setCurrentFrame(newFrame);
  };

  // Handle batch categorization
  const handleBatchCategorize = (startFrame: number, endFrame: number, category: string, side: 'left' | 'right' | 'both') => {
    if (isSaving) return;

    const newChanges: { [key: string]: CategorizationData } = {};

    for (let frameNum = startFrame; frameNum <= endFrame; frameNum++) {
      const frameData = frames.find(f => f.frameNumber === frameNum - 1);
      if (!frameData) continue;

      const sides = side === 'both' ? ['left', 'right'] : [side];

      sides.forEach(frameSide => {
        const frameId = frameSide === 'left' ? frameData.leftFrameId : frameData.rightFrameId;
        if (!frameId) return;

        const key = `frame_${frameId}_${frameSide}`;
        const existingCat = unsavedChanges[key] || categorizations[key] || { category: '0', flagged: false, note: null };

        newChanges[key] = {
          ...existingCat,
          category,
          frame_id: frameId
        };
      });
    }

    setUnsavedChanges(prev => ({
      ...prev,
      ...newChanges
    }));
  };

  // Handle frame jump
  const handleFrameJump = (frameNumber: number) => {
    if (isSaving) return;
    if (frameNumber >= 1 && frameNumber <= totalFrames) {
      setCurrentFrame(frameNumber);
    }
  };

  // Handle manual download
  const handleDownloadManual = () => {
    const link = document.createElement('a');
    link.href = '/documents/Tutorial.pptx';
    link.download = 'Tutorial.pptx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Show loading screen until everything is ready
  if (!isFullyLoaded) {
    return (
      <WorkspaceLoader
        loadingSteps={{
          frames: isLoadingFrames,
          categorizations: isLoadingCategorizations,
          conversationData: false
        }}
      />
    );
  }

  // Show error screen if there's an error
  if (loadingError) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="text-red-500 text-4xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Workspace</h2>
          <p className="text-gray-600 mb-4">{loadingError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-2 flex-shrink-0 h-14">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => window.history.back()}
              className="text-gray-600 hover:text-gray-800"
              disabled={isSaving}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-base font-semibold text-gray-900">
                Group {group}
              </h1>
              {currentFrameData && (
                <p className="text-xs text-gray-500">
                  Frame: {currentFrameData.name} | Segment: {currentFrameData.segment_id} (Order: {currentFrameData.segment_order})
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <SaveStatusIndicator saveStatus={saveStatus} />
            <button
              onClick={handleManualSave}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                hasUnsavedChanges && !isSaving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!hasUnsavedChanges || isSaving}
              title={isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save changes (Ctrl+S)' : 'No changes to save'}
            >
              {isSaving ? 'Saving...' : hasUnsavedChanges ? `Save (${Object.keys(unsavedChanges).length})` : 'Saved'}
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              title="Logout"
              disabled={isSaving}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Coding Legend */}
      <div className="bg-yellow-50 border-b px-6 py-1 flex-shrink-0 h-8 flex items-center justify-center">
        <div className="flex items-center justify-between w-full max-w-6xl">
          <div></div>
          <p className="text-xs text-gray-800 text-center">
            <strong>0 = All Good, 1 = Partial Frame, 2 = Full Cover, 3 = Partial Cover, 4 = Tilt, 5 = Drinking, 6 = Eating, 7 = Yawning, 8 = Weird Face, 9 = End</strong>
          </p>
          <button
            onClick={handleDownloadManual}
            className="flex items-center space-x-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors flex-shrink-0"
            title="Download full tutorial manual"
            disabled={isSaving}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Help</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col justify-center items-center min-h-0">
        <FrameDisplay
          currentFrame={currentFrame}
          currentFrameData={currentFrameData}
          isLoadingFrames={isLoadingFrames}
          loadingError={loadingError}
          isFrameFlagged={isFrameFlagged}
        />

        <div className="flex flex-col items-center space-y-3">
          <div className="flex items-center space-x-4">
            <FrameNavigation
              currentFrame={currentFrame}
              totalFrames={totalFrames}
              isLoadingFrames={isLoadingFrames}
              onFrameChange={handleFrameChange}
              disabled={isSaving}
            />

            <FrameJumper
              currentFrame={currentFrame}
              totalFrames={totalFrames}
              onFrameJump={handleFrameJump}
              disabled={isSaving}
            />
          </div>

          <CodingInterface
            leftCategory={leftCategory}
            rightCategory={rightCategory}
            activeSide={activeSide}
          />

          <div className="flex items-center space-x-4">
            <ActionButtons
              isFrameFlagged={isFrameFlagged}
              frameHasNote={frameHasNote}
              conversationNote=""
              onFlagForReview={handleFlagForReview}
              onImageNote={handleImageNote}
              onConversationNote={() => {}}
              disabled={isSaving}
            />

            <BatchCategorizer
              totalFrames={totalFrames}
              onBatchCategorize={handleBatchCategorize}
              disabled={isSaving}
            />
          </div>

          <div className="text-xs text-gray-500 text-center">
            {isSaving ? (
              <span className="text-blue-600 font-medium">🔒 Saving... Please wait</span>
            ) : (
              <>← → arrows: navigate frames | Tab: switch left/right | 0-9: set category | Ctrl+S: save</>
            )}
          </div>
        </div>
      </div>

      <SavingModal isOpen={isSaving} />

      <NoteModal
        isOpen={noteModal.isOpen && !isSaving}
        title={noteModal.title}
        initialNote={noteModal.note}
        onSave={handleNoteSave}
        onClose={() => setNoteModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workspace...</p>
        </div>
      </div>
    }>
      <WorkspaceContent />
    </Suspense>
  );
}