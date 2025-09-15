'use client';

interface SaveStatus {
  status: 'saved' | 'saving' | 'unsaved' | 'error';
  lastSaved?: Date;
  message?: string;
}

interface SaveStatusIndicatorProps {
  saveStatus: SaveStatus;
}

export default function SaveStatusIndicator({ saveStatus }: SaveStatusIndicatorProps) {
  const getStatusColor = () => {
    switch (saveStatus.status) {
      case 'saved': return 'text-green-600';
      case 'saving': return 'text-blue-600';
      case 'unsaved': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (saveStatus.status) {
      case 'saved': return '✓';
      case 'saving': return '⟳';
      case 'unsaved': return '●';
      case 'error': return '⚠';
      default: return '';
    }
  };

  return (
    <div className={`flex items-center space-x-1 text-xs ${getStatusColor()}`}>
      <span className={saveStatus.status === 'saving' ? 'animate-spin' : ''}>{getStatusIcon()}</span>
      <span>{saveStatus.message || saveStatus.status}</span>
      {saveStatus.lastSaved && (
        <span className="text-gray-400">
          {saveStatus.lastSaved.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
} 