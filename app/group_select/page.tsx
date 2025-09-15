'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  display_name: string;
}

interface GroupData {
  id: number;
  group_number: string;
  completed: boolean;
  completed_at: string | null;
}

export default function GroupSelectPage() {
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

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

  // Load groups on component mount
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const response = await fetch('/api/groups');
        if (response.ok) {
          const data = await response.json();
          setGroups(data.groups || []);
        }
      } catch (error) {
        console.error('Failed to load groups:', error);
      }
    };

    loadGroups();
  }, []);


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

  const navigateToWorkspace = (groupId: string) => {
    router.push(`/workspace?group=${groupId}`);
  };

  // Toggle completion status
  const toggleCompletion = async (groupId: number, completed: boolean, event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation(); // Prevent navigation when clicking checkbox

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: groupId,
          completed: !completed
        })
      });

      if (response.ok) {
        // Update the local state
        setGroups(prev => prev.map(group =>
          group.id === groupId
            ? { ...group, completed: !completed, completed_at: !completed ? new Date().toISOString() : null }
            : group
        ));
      } else {
        console.error('Failed to update completion status');
      }
    } catch (error) {
      console.error('Error updating completion status:', error);
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
    <div className="min-h-screen bg-gray-50 flex flex-col p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          {currentUser && (
            <p className="text-sm text-gray-600">
              Welcome, <span className="font-medium text-blue-600">{currentUser.display_name}</span>
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


      {/* Groups Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 flex-1">
        {groups.map((group) => (
          <div
            key={group.id}
            className={`bg-white rounded-lg shadow-lg p-6 border-2 transition-all relative ${
              group.completed
                ? 'border-green-500 bg-green-50'
                : 'border-transparent hover:shadow-xl hover:border-blue-500'
            }`}
          >
            {/* Completion Checkbox */}
            <div className="absolute top-2 right-2">
              <input
                type="checkbox"
                checked={group.completed}
                onChange={(e) => toggleCompletion(group.id, group.completed, e)}
                className="w-5 h-5 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                title={group.completed ? 'Mark as incomplete' : 'Mark as complete'}
              />
            </div>

            <button
              onClick={() => navigateToWorkspace(group.id.toString())}
              className="text-center w-full h-full flex flex-col justify-center focus:outline-none"
            >
              <div className={`text-4xl font-bold mb-2 ${
                group.completed ? 'text-green-600' : 'text-blue-600'
              }`}>
                {group.group_number}
              </div>
              <div className="text-lg font-medium text-gray-900">
                Group {group.group_number}
              </div>
              {group.completed && (
                <div className="text-sm text-green-600 font-medium mt-2">
                  ✓ Completed
                </div>
              )}
              {group.completed && group.completed_at && (
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(group.completed_at).toLocaleDateString()}
                </div>
              )}
            </button>
          </div>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">Loading groups...</div>
        </div>
      )}
    </div>
  );
}