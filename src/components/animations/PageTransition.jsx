import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * PageTransition - Wraps page content with smooth entrance animations
 */
export default function PageTransition({ children, className = '' }) {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsVisible(false);
    // Small delay to trigger animation
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div 
      className={`transition-all duration-500 ease-out ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-4'
      } ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * FadeIn - Simple fade-in animation wrapper
 */
export function FadeIn({ 
  children, 
  delay = 0, 
  duration = 500, 
  direction = 'up', // 'up', 'down', 'left', 'right', 'none'
  className = '' 
}) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  const getTransform = () => {
    if (isVisible) return 'translate(0, 0)';
    switch (direction) {
      case 'up': return 'translateY(20px)';
      case 'down': return 'translateY(-20px)';
      case 'left': return 'translateX(20px)';
      case 'right': return 'translateX(-20px)';
      default: return 'translate(0, 0)';
    }
  };

  return (
    <div
      ref={elementRef}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: getTransform(),
        transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`
      }}
    >
      {children}
    </div>
  );
}

/**
 * SlideIn - Slides content in from a direction
 */
export function SlideIn({
  children,
  direction = 'left', // 'left', 'right', 'top', 'bottom'
  delay = 0,
  duration = 500,
  className = ''
}) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  const getInitialTransform = () => {
    switch (direction) {
      case 'left': return 'translateX(-50px)';
      case 'right': return 'translateX(50px)';
      case 'top': return 'translateY(-50px)';
      case 'bottom': return 'translateY(50px)';
      default: return 'translateX(-50px)';
    }
  };

  return (
    <div
      ref={elementRef}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translate(0, 0)' : getInitialTransform(),
        transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`
      }}
    >
      {children}
    </div>
  );
}

/**
 * ScaleIn - Scales content in with a bounce effect
 */
export function ScaleIn({
  children,
  delay = 0,
  duration = 400,
  className = ''
}) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={elementRef}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.8)',
        transition: `opacity ${duration}ms ease-out, transform ${duration}ms cubic-bezier(0.175, 0.885, 0.32, 1.275)`
      }}
    >
      {children}
    </div>
  );
}

/**
 * Stagger - Applies staggered animations to children
 */
export function Stagger({
  children,
  staggerDelay = 100,
  initialDelay = 0,
  animation = 'fadeUp', // 'fadeUp', 'fadeIn', 'scaleIn', 'slideLeft', 'slideRight'
  className = ''
}) {
  const getAnimationClass = (index) => {
    const delay = initialDelay + (index * staggerDelay);
    return {
      animationDelay: `${delay}ms`
    };
  };

  const getChildClassName = () => {
    switch (animation) {
      case 'fadeUp': return 'animate-card-enter';
      case 'fadeIn': return 'animate-page-in';
      case 'scaleIn': return 'animate-modal-content';
      case 'slideLeft': return 'animate-card-left';
      case 'slideRight': return 'animate-card-right';
      default: return 'animate-card-enter';
    }
  };

  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        
        return (
          <div 
            className={getChildClassName()} 
            style={getAnimationClass(index)}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}
