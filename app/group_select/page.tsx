'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SegmentData {
  id: number;
  order_presented: number;
  group_id: number;
  it_groups: {
    group_number: string;
  };
}

interface User {
  id: number;
  display_name: string;
}

interface GroupData {
  id: number;
  group_number: string;
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
    <div className="min-h-screen bg-gray-50 flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Select Image Group</h1>
          {currentUser && (
            <p className="text-sm text-gray-600 mt-1">
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

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-4 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Instructions</h2>
        <p className="text-gray-700">
          Click on any group below to start categorizing all images from that group.
          All segments within the group will be presented in order.
        </p>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 flex-1">
        {groups.map((group) => (
          <button
            key={group.id}
            onClick={() => navigateToWorkspace(group.id.toString())}
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow border-2 border-transparent hover:border-blue-500 focus:border-blue-500 focus:outline-none"
          >
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {group.group_number}
              </div>
              <div className="text-lg font-medium text-gray-900 mb-1">
                Group {group.group_number}
              </div>
              <div className="text-sm text-gray-500">
                Click to start categorizing
              </div>
            </div>
          </button>
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