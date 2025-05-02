import React from 'react';

interface QuizzAiLoaderProps {
  size?: 'sm' | 'md' | 'lg';
}

const QuizzAiLoader: React.FC<QuizzAiLoaderProps> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
    <div className="flex items-center justify-center">
      <div className={`${sizeClasses[size]} relative`}>
        <div className="absolute inset-0 rounded-full border-t-2 border-b-2 border-quizzai-blue animate-spin"></div>
        <div className="absolute inset-0 rounded-full border-r-2 border-l-2 border-quizzai-orange animate-spin animation-delay-500"></div>
        <div className="absolute inset-0 rounded-full border-t-2 border-b-2 border-quizzai-purple animate-spin animation-delay-1000"></div>
        <div className="absolute inset-0 rounded-full border-r-2 border-l-2 border-quizzai-red animate-spin animation-delay-1500"></div>
      </div>
    </div>
  );
};

export default QuizzAiLoader;