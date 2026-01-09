import React, { useState, useEffect, useRef } from 'react';

/**
 * AnimatedCounter - Animates a number counting up from 0 to the target value
 * @param {number} value - The target number to count to
 * @param {number} duration - Animation duration in ms (default: 1000)
 * @param {string} prefix - Text before the number (e.g., 'R' for currency)
 * @param {string} suffix - Text after the number (e.g., 'h' for hours)
 * @param {number} decimals - Number of decimal places (default: 0)
 * @param {string} className - Additional CSS classes
 */
export default function AnimatedCounter({ 
  value, 
  duration = 1000, 
  prefix = '', 
  suffix = '', 
  decimals = 0,
  className = '',
  startOnView = true
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef(null);
  const animationRef = useRef(null);
  const latestValueRef = useRef(0);

  useEffect(() => {
    // Always coerce to a sane number.
    const numeric = Number(value);
    latestValueRef.current = Number.isFinite(numeric) ? numeric : 0;

    if (!startOnView) {
      animateValue();
      return;
    }

    // If we've already animated once (element is on screen), re-animate on value changes.
    // This makes counters work for async-loaded dashboard stats.
    if (hasAnimated) {
      animateValue();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          animateValue();
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      observer.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, hasAnimated, startOnView]);

  const animateValue = () => {
    const startTime = performance.now();
    const startValue = 0;
    const endValue = latestValueRef.current;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out cubic)
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = startValue + (endValue - startValue) * easeOutCubic;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const formatValue = (val) => {
    return val.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  return (
    <span ref={elementRef} className={`animate-count ${className}`}>
      {prefix}{formatValue(displayValue)}{suffix}
    </span>
  );
}

/**
 * AnimatedPercentage - Animates a percentage with circular progress
 */
export function AnimatedPercentage({ 
  value, 
  size = 60, 
  strokeWidth = 6,
  duration = 1000,
  color = '#3b82f6',
  backgroundColor = '#e5e7eb',
  showValue = true,
  className = ''
}) {
  const [progress, setProgress] = useState(0);
  const elementRef = useRef(null);
  const animationRef = useRef(null);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          animateProgress();
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      observer.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value]);

  const animateProgress = () => {
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progressRatio = Math.min(elapsed / duration, 1);
      const easeOutCubic = 1 - Math.pow(1 - progressRatio, 3);
      
      setProgress(value * easeOutCubic);

      if (progressRatio < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  return (
    <div ref={elementRef} className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.1s ease' }}
        />
      </svg>
      {showValue && (
        <span className="absolute text-sm font-semibold">
          {Math.round(progress)}%
        </span>
      )}
    </div>
  );
}

/**
 * StaggeredList - Wraps children and applies staggered animation
 */
export function StaggeredList({ children, className = '', baseDelay = 0.05 }) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        
        return React.cloneElement(child, {
          className: `${child.props.className || ''} animate-card-enter`,
          style: {
            ...child.props.style,
            animationDelay: `${index * baseDelay}s`
          }
        });
      })}
    </div>
  );
}
