import React from 'react';

/**
 * Skeleton Loaders - Beautiful loading states
 */

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="skeleton h-3 w-16 mb-2"></div>
          <div className="skeleton h-5 w-3/4 mb-2"></div>
        </div>
        <div className="skeleton h-6 w-20 rounded-full"></div>
      </div>
      <div className="skeleton h-4 w-1/2 mb-4"></div>
      <div className="space-y-3">
        <div className="skeleton h-2 w-full rounded-full"></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="skeleton h-12 rounded"></div>
          <div className="skeleton h-12 rounded"></div>
        </div>
      </div>
      <div className="flex gap-2 mt-4 pt-4 border-t">
        <div className="skeleton h-9 flex-1 rounded-lg"></div>
        <div className="skeleton h-9 flex-1 rounded-lg"></div>
        <div className="skeleton h-9 w-9 rounded-lg"></div>
      </div>
    </div>
  );
}

export function SkeletonStats({ className = '' }) {
  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="skeleton h-12 w-12 rounded-lg"></div>
        <div>
          <div className="skeleton h-7 w-12 mb-1"></div>
          <div className="skeleton h-4 w-20"></div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5, className = '' }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className={`skeleton h-4 ${i === 0 ? 'w-1/4' : 'w-1/6'}`}></div>
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-4 py-4 flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, colIndex) => (
              <div 
                key={colIndex} 
                className={`skeleton h-4 ${colIndex === 0 ? 'w-1/4' : 'w-1/6'}`}
                style={{ animationDelay: `${rowIndex * 0.1}s` }}
              ></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({ items = 5, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, index) => (
        <div 
          key={index} 
          className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div className="skeleton h-10 w-10 rounded-full"></div>
          <div className="flex-1">
            <div className="skeleton h-4 w-3/4 mb-2"></div>
            <div className="skeleton h-3 w-1/2"></div>
          </div>
          <div className="skeleton h-6 w-16 rounded-full"></div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ className = '' }) {
  return (
    <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 ${className}`}>
      <div className="skeleton h-6 w-1/4 mb-4"></div>
      <div className="flex items-end gap-2 h-48">
        {Array.from({ length: 12 }).map((_, index) => (
          <div 
            key={index} 
            className="skeleton flex-1 rounded-t"
            style={{ 
              height: `${30 + Math.random() * 70}%`,
              animationDelay: `${index * 0.05}s`
            }}
          ></div>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="skeleton h-3 w-8"></div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonProfile({ className = '' }) {
  return (
    <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 ${className}`}>
      <div className="flex items-center gap-4 mb-4">
        <div className="skeleton h-16 w-16 rounded-full"></div>
        <div>
          <div className="skeleton h-5 w-32 mb-2"></div>
          <div className="skeleton h-4 w-24"></div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="skeleton h-4 w-full"></div>
        <div className="skeleton h-4 w-5/6"></div>
        <div className="skeleton h-4 w-4/6"></div>
      </div>
    </div>
  );
}

/**
 * Full Page Loader with animated elements
 */
export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center min-h-[400px] animate-page-in">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          {/* Outer ring */}
          <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
          {/* Spinning ring */}
          <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin-smooth"></div>
          {/* Inner pulse */}
          <div className="absolute inset-3 bg-blue-50 rounded-full animate-pulse-soft"></div>
        </div>
        <p className="text-gray-600 font-medium">{message}</p>
        <div className="flex justify-center gap-1 mt-2">
          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
        </div>
      </div>
    </div>
  );
}

/**
 * Success Animation
 */
export function SuccessAnimation({ size = 80, className = '' }) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} viewBox="0 0 52 52">
        <circle
          className="checkmark-circle"
          cx="26"
          cy="26"
          r="25"
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
        />
        <path
          className="checkmark-check"
          fill="none"
          stroke="#10b981"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.1 27.2l7.1 7.2 16.7-16.8"
        />
      </svg>
    </div>
  );
}
