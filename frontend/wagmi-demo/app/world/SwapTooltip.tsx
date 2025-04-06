import React, { useState } from 'react';

interface TooltipProps {
  title: string;
  content: string;
  children: React.ReactNode;
}

const SwapTooltip: React.FC<TooltipProps> = ({ title, content, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div 
        className="cursor-help flex items-center"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
        <svg className="w-4 h-4 ml-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </div>
      
      {isVisible && (
        <div className="absolute z-10 w-64 p-4 mt-2 bg-white rounded-md shadow-lg border border-gray-200 left-0 transform -translate-x-1/4">
          <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-600">{content}</p>
        </div>
      )}
    </div>
  );
};

export default SwapTooltip;