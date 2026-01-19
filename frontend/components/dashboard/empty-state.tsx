'use client';

import LottieAnimation from '@/components/ui/lottie-animation';
import { ANIMATIONS } from '@/lib/animations';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

interface EmptyStateProps {
  title: string;
  description: string;
  animationUrl?: string; // CDN URL
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  title,
  description,
  animationUrl = ANIMATIONS.NO_DATA, // Default no-data animation
  action
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {animationUrl ? (
        <div className="mb-6">
          <LottieAnimation
            src={animationUrl}
            width={300}
            height={300}
          />
        </div>
      ) : (
        <DocumentTextIcon className="w-20 h-20 mx-auto text-gray-400 mb-6" />
      )}
      
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      
      <p className="text-gray-500 text-center max-w-md mb-6">
        {description}
      </p>
      
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
