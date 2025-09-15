'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { McNultyStudyStructure, getTimepoints, getCouplesByTimepoint, getConversationsForCouple } from '../study_structure';

interface ConversationData {
  id: number;
  convo_number: number;
  first_pass_completed: boolean;
  second_pass_completed: boolean;
  final_pass_locked: boolean;
  note: string | null;
  first_pass_user?: { display_name: string };
  second_pass_user?: { display_name: string };
  in_progress_user?: { display_name: string };
  iv_couples: {
    code: string;
  };
}

interface User {
  id: number;
  display_name: string;
  role: 'admin' | 'coder';
}

interface ConversationStats {
  total: number;
  locked: number;
  second_pass: number;
  first_pass: number;
  in_progress: number;
  available: number;
}

export default function ConversationSelectPage() {
  const [selectedTimepoint, setSelectedTimepoint] = useState<string>('T1');
  const [selectedCouple, setSelectedCouple] = useState<string>('');
  const [selectedConversation, setSelectedConversation] = useState<string>('');
  const [expandedGroup, setExpandedGroup] = useState<string>('');
  const [conversationData, setConversationData] = useState<{ [key: string]: ConversationData[] }>({});
  const [groupStats, setGroupStats] = useState<{ [key: string]: ConversationStats }>({});
  const [loadingGroups, setLoadingGroups] = useState<Set<string>>(new Set());
  const [loadingStats, setLoadingStats] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [noteModal, setNoteModal] = useState<{ isOpen: boolean; note: string; title: string }>({
    isOpen: false,
    note: '',
    title: ''
  });

  const router = useRouter();

  // Load current user on component mount
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const response = await fetch('/api/workspace/current-user');
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData.user);
        } else if (response.status === 401) {
          // No session, redirect to login
          router.push('/');
        }
      } catch (error) {
        console.error('Failed to load current user:', error);
        router.push('/');
      } finally {
        setIsLoadingUser(false);
      }
    };

    loadCurrentUser();
  }, [router]);

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

  const timepoints = getTimepoints(McNultyStudyStructure);
  const couples = getCouplesByTimepoint(McNultyStudyStructure, selectedTimepoint);

  // Group couples in chunks of 8
  const groupCouples = (coupleList: string[]) => {
    const groups: { [key: string]: string[] } = {};
    const sortedCouples = [...coupleList].sort();
    
    const chunkSize = 8;
    for (let i = 0; i < sortedCouples.length; i += chunkSize) {
      const chunk = sortedCouples.slice(i, i + chunkSize);
      const firstCouple = chunk[0];
      const lastCouple = chunk[chunk.length - 1];
      const groupKey = `${firstCouple}-${lastCouple}`;
      groups[groupKey] = chunk;
    }
    
    return groups;
  };

  const coupleGroups = groupCouples(couples);

  // Fetch statistics for a group
  const fetchGroupStats = useCallback(async (groupName: string, groupCouples: string[]) => {
    setLoadingStats(prev => new Set(prev).add(groupName));
    
    try {
      const response = await fetch(
        `/api/convo_select/conversations?timepoint=${selectedTimepoint}&couples=${groupCouples.join(',')}&summary_only=true`
      );
      
      if (response.ok) {
        const data = await response.json();
        setGroupStats(prev => ({
          ...prev,
          [groupName]: data.stats
        }));
      }
    } catch (error) {
      console.error('Failed to fetch group stats:', error);
    } finally {
      setLoadingStats(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupName);
        return newSet;
      });
    }
  }, [selectedTimepoint]);

  // Load stats for all groups when timepoint changes
  useEffect(() => {
    const loadAllStats = async () => {
      const groups = groupCouples(couples);
      setGroupStats({}); // Clear existing stats first
      
      const promises = Object.entries(groups).map(([groupName, groupCouples]) => 
        fetchGroupStats(groupName, groupCouples)
      );
      await Promise.all(promises);
    };

    if (selectedTimepoint && couples.length > 0) {
      loadAllStats();
    }
  }, [selectedTimepoint, couples.length, fetchGroupStats]);

  const fetchConversationData = useCallback(async (groupName: string, groupCouples: string[]) => {
    if (conversationData[groupName]) return; // Already loaded

    setLoadingGroups(prev => new Set(prev).add(groupName));
    
    try {
      const response = await fetch(
        `/api/convo_select/conversations?timepoint=${selectedTimepoint}&couples=${groupCouples.join(',')}`
      );
      
      if (response.ok) {
        const result = await response.json();
        setConversationData(prev => ({
          ...prev,
          [groupName]: result.data || []
        }));
        
        // Also update stats if we got them
        if (result.stats) {
          setGroupStats(prev => ({
            ...prev,
            [groupName]: result.stats
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch conversation data:', error);
    } finally {
      setLoadingGroups(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupName);
        return newSet;
      });
    }
  }, [selectedTimepoint, conversationData]);

  const handleGroupToggle = (groupName: string, groupCouples: string[]) => {
    if (expandedGroup === groupName) {
      setExpandedGroup('');
    } else {
      setExpandedGroup(groupName);
      fetchConversationData(groupName, groupCouples);
    }
  };

  const getConversationInfo = (couple: string, convNumber: number, groupName: string) => {
    const groupData = conversationData[groupName] || [];
    return groupData.find(conv => 
      conv.iv_couples.code === couple && conv.convo_number === convNumber
    );
  };

  const getPassStatus = (convInfo: ConversationData | undefined) => {
    if (!convInfo) return { status: 'Not in DB', user: '', color: 'bg-gray-400' };
    
    // Check if someone is working on it
    if (convInfo.in_progress_user) {
      return { 
        status: 'In Progress', 
        user: convInfo.in_progress_user.display_name,
        color: 'bg-orange-500' 
      };
    }
    
    if (convInfo.final_pass_locked) {
      return { 
        status: 'Locked', 
        user: 'Michael',  // Always Michael for locked conversations
        color: 'bg-green-500' 
      };
    } else if (convInfo.second_pass_completed) {
      const user = convInfo.second_pass_user?.display_name || '';
      return { 
        status: '2nd Pass', 
        user: user,
        color: 'bg-blue-500' 
      };
    } else if (convInfo.first_pass_completed) {
      const user = convInfo.first_pass_user?.display_name || '';
      return { 
        status: '1st Pass', 
        user: user,
        color: 'bg-yellow-500' 
      };
    } else {
      return { 
        status: 'Available', 
        user: '',
        color: 'bg-gray-300' 
      };
    }
  };

  const handleNoteClick = (convInfo: ConversationData | undefined, couple: string, convNumber: number) => {
    if (!convInfo) return;
    
    setNoteModal({
      isOpen: true,
      note: convInfo.note || 'No note available',
      title: `${selectedTimepoint}/${couple}_C${convNumber} - Note`
    });
  };

  const navigateToWorkspace = (timepoint: string, couple: string, conversationNumber: string) => {
    router.push(`/workspace?timepoint=${timepoint}&couple=${couple}&conversation=${conversationNumber}`);
  };

  const handleStart = () => {
    if (selectedCouple && selectedConversation) {
      // Parse the conversation ID to get the conversation number
      const conversationMatch = selectedConversation.match(/c(\d+)$/);
      const conversationNumber = conversationMatch ? conversationMatch[1] : '1';
      
      navigateToWorkspace(selectedTimepoint, selectedCouple, conversationNumber);
    }
  };

  const canEnterConversation = (convInfo: ConversationData | undefined) => {
    console.log('Checking conversation access:', {
      convInfo: convInfo?.id,
      isLocked: convInfo?.final_pass_locked,
      currentUser: currentUser,
      userRole: currentUser?.role,
      canEnter: !convInfo ? false : !convInfo.final_pass_locked ? true : currentUser?.role === 'admin'
    });
    
    if (!convInfo) return false; // Can't enter if not in database
    if (!convInfo.final_pass_locked) return true; // Can enter if not locked
    return currentUser?.role === 'admin'; // Only admin can enter locked conversations
  };

  const handleConversationClick = (couple: string, convNumber: number, convInfo: ConversationData | undefined) => {
    console.log('Conversation clicked:', { couple, convNumber, convInfo: convInfo?.id });
    
    if (!convInfo) {
      console.log('No conversation info, returning');
      return; // Can't enter a conversation that doesn't exist in DB
    }
    
    // Check if user can enter this conversation
    const canEnter = canEnterConversation(convInfo);
    console.log('Can enter conversation?', canEnter);
    
    if (!canEnter) {
      console.log('Cannot enter conversation - blocked');
      // Show a message or do nothing for locked conversations
      return;
    }
    
    console.log('Navigating to workspace...');
    setSelectedCouple(couple);
    setSelectedConversation(`${selectedTimepoint.toLowerCase()}_${couple}_c${convNumber}`);
    
    // Navigate immediately
    navigateToWorkspace(selectedTimepoint, couple, convNumber.toString());
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

  // Helper function to render stats badges
  const renderStatsBadges = (stats: ConversationStats) => {
    const badges = [];
    
    if (stats.available > 0) {
      badges.push(
        <span key="available" className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
          {stats.available} Available
        </span>
      );
    }
    
    if (stats.in_progress > 0) {
      badges.push(
        <span key="in_progress" className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
          {stats.in_progress} In Progress
        </span>
      );
    }
    
    if (stats.first_pass > 0) {
      badges.push(
        <span key="first_pass" className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
          {stats.first_pass} 1st Pass
        </span>
      );
    }
    
    if (stats.second_pass > 0) {
      badges.push(
        <span key="second_pass" className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
          {stats.second_pass} 2nd Pass
        </span>
      );
    }
    
    if (stats.locked > 0) {
      badges.push(
        <span key="locked" className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
          {stats.locked} Locked
        </span>
      );
    }
    
    return badges;
  };

  // Show loading indicator while user data is loading
  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex p-6">
      {/* Left Panel */}
      <div className="w-96 bg-white shadow-lg p-6 rounded-lg mr-6">
        {/* Header with welcome and logout */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Select Conversation</h1>
            {currentUser && (
              <p className="text-sm text-gray-600 mt-1">
                Welcome, <span className="font-medium text-blue-600">{currentUser.display_name}</span>
                {currentUser.role === 'admin' && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">Admin</span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {/* Help/Manual Download Button */}
            <button
              onClick={handleDownloadManual}
              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
              title="Download Tutorial Manual"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              title="Logout"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Timepoint Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timepoint
          </label>
          <select
            value={selectedTimepoint}
            onChange={(e) => {
              setSelectedTimepoint(e.target.value);
              setSelectedCouple('');
              setSelectedConversation('');
              setExpandedGroup('');
              setConversationData({}); // Clear cached data
            }}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {timepoints.map((timepoint) => (
              <option key={timepoint} value={timepoint}>
                {timepoint}
              </option>
            ))}
          </select>
        </div>

        {/* Couple Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Couple
          </label>
          <select
            value={selectedCouple}
            onChange={(e) => {
              setSelectedCouple(e.target.value);
              setSelectedConversation('');
            }}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={!selectedTimepoint}
          >
            <option value="">Select couple</option>
            {couples.map((couple) => (
              <option key={couple} value={couple}>
                {couple}
              </option>
            ))}
          </select>
        </div>

        {/* Conversation Selection */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Conversation
          </label>
          <select
            value={selectedConversation}
            onChange={(e) => setSelectedConversation(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={!selectedCouple}
          >
            <option value="">Select conversation</option>
            {selectedCouple && getConversationsForCouple(selectedTimepoint, selectedCouple).map((conv) => (
              <option key={conv.id} value={conv.id}>
                Conversation {conv.number}
              </option>
            ))}
          </select>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={!selectedConversation}
          className="w-full py-3 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Start
        </button>
      </div>

      {/* Right Panel */}
      <div className="flex-1 bg-white rounded-lg shadow-lg p-6">
        {/* Timepoint Tabs */}
        <div className="flex space-x-1 mb-6">
          {timepoints.map((timepoint) => (
            <button
              key={timepoint}
              onClick={() => {
                setSelectedTimepoint(timepoint);
                setSelectedCouple('');
                setSelectedConversation('');
                setExpandedGroup('');
                setConversationData({});
              }}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                selectedTimepoint === timepoint
                  ? 'text-blue-600 border-blue-600 bg-blue-50'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {timepoint}
            </button>
          ))}
        </div>

        {/* Couple Groups List */}
        <div className="space-y-4">
          {Object.entries(coupleGroups).map(([groupName, groupCouples]) => {
            const stats = groupStats[groupName];
            const isLoadingGroupStats = loadingStats.has(groupName);
            
            return (
              <div key={groupName} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => handleGroupToggle(groupName, groupCouples)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <svg 
                      className={`w-4 h-4 mr-2 transition-transform ${expandedGroup === groupName ? 'rotate-90' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Couples {groupName}</span>
                      {/* Stats badges */}
                      {isLoadingGroupStats ? (
                        <div className="flex items-center mt-1">
                          <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                          <span className="text-xs text-gray-500">Loading stats...</span>
                        </div>
                      ) : stats ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {renderStatsBadges(stats)}
                        </div>
                      ) : null}
                    </div>
                    {loadingGroups.has(groupName) && (
                      <div className="ml-2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </div>
                </button>
                
                {expandedGroup === groupName && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    {loadingGroups.has(groupName) ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="text-sm text-gray-600">Loading conversations...</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {groupCouples.map((couple) => {
                          const conversations = getConversationsForCouple(selectedTimepoint, couple);
                          return (
                            <div key={couple} className="space-y-1">
                              <div className="text-xs font-medium text-gray-600 mb-1">{couple}</div>
                              {conversations.map((conv) => {
                                const convInfo = getConversationInfo(couple, conv.number, groupName);
                                const passStatus = getPassStatus(convInfo);
                                const hasNote = convInfo?.note && convInfo.note.trim().length > 0;
                                const canEnter = canEnterConversation(convInfo);
                                
                                return (
                                  <button
                                    key={conv.id}
                                    onClick={() => handleConversationClick(couple, conv.number, convInfo)}
                                    disabled={!canEnter}
                                    className={`w-full p-2 text-xs text-left rounded border transition-colors relative ${
                                      selectedConversation === conv.id
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : canEnter
                                          ? 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
                                          : 'border-red-200 bg-red-50 text-red-400 cursor-not-allowed'
                                    }`}
                                    title={!canEnter && convInfo?.final_pass_locked ? 'This conversation is locked (Admin only)' : ''}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span>C{conv.number}</span>
                                      <div className="flex items-center space-x-1">
                                        {/* Note icon - clickable */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleNoteClick(convInfo, couple, conv.number);
                                          }}
                                          className={`w-3 h-3 ${hasNote ? 'text-blue-600' : 'text-gray-300'} hover:text-blue-800`}
                                          disabled={!convInfo}
                                        >
                                          <svg fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                          </svg>
                                        </button>
                                        {/* Status dot */}
                                        <div className={`w-2 h-2 rounded-full ${passStatus.color}`}></div>
                                        {/* Lock icon for locked conversations */}
                                        {convInfo?.final_pass_locked && (
                                          <div className="w-3 h-3 text-red-500" title="Locked">
                                            <svg fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                            </svg>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 truncate">
                                      {passStatus.status}
                                      {passStatus.user && (
                                        <span className="block">
                                          {passStatus.status === 'In Progress' ? `by ${passStatus.user}` : `- ${passStatus.user}`}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Note Modal */}
      {noteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{noteModal.title}</h3>
              <button
                onClick={() => setNoteModal({ isOpen: false, note: '', title: '' })}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {noteModal.note}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setNoteModal({ isOpen: false, note: '', title: '' })}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
