'use client';

interface CodingInterfaceProps {
  leftCategory: string;
  rightCategory: string;
  activeSide: 'left' | 'right';
}

export default function CodingInterface({
  leftCategory,
  rightCategory,
  activeSide
}: CodingInterfaceProps) {
  return (
    <div className="flex items-center space-x-6">
      {/* Left Side */}
      <div className={`text-center p-3 rounded-lg border-2 transition-colors w-24 ${
        activeSide === 'left' 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 bg-white'
      }`}>
        <h3 className="text-sm font-medium mb-1">Left</h3>
        <div className="text-4xl font-bold text-blue-600">{leftCategory}</div>
      </div>

      {/* Right Side */}
      <div className={`text-center p-3 rounded-lg border-2 transition-colors w-24 ${
        activeSide === 'right' 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 bg-white'
      }`}>
        <h3 className="text-sm font-medium mb-1">Right</h3>
        <div className="text-4xl font-bold text-blue-600">{rightCategory}</div>
      </div>
    </div>
  );
} 