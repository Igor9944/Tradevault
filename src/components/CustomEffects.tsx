import React, { useEffect, useRef, useState } from 'react';

export default function CustomEffects() {
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Cursor coordinates
  const mouseRef = useRef({ x: 0, y: 0 });
  const lagRef = useRef({ x: 0, y: 0 });

  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorFollowerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Skip custom cursor on touch devices to avoid issues
    const isDesktop = window.matchMedia('(any-hover: hover)').matches;
    if (!isDesktop) return;

    // Show cursor on first mouse move
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      if (!isVisible) {
        setIsVisible(true);
        document.documentElement.classList.add('custom-cursor-active');
      }
    };

    const handleMouseLeaveWindow = () => {
      setIsVisible(false);
      document.documentElement.classList.remove('custom-cursor-active');
    };

    const handleMouseEnterWindow = () => {
      setIsVisible(true);
      document.documentElement.classList.add('custom-cursor-active');
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeaveWindow);
    document.addEventListener('mouseenter', handleMouseEnterWindow);

    // Setup lerp loop
    let animFrame: number;
    const lerp = (start: number, end: number, factor: number) => {
      return start + (end - start) * factor;
    };

    const updatePosition = () => {
      // Direct dot update
      if (cursorDotRef.current) {
        cursorDotRef.current.style.left = `${mouseRef.current.x}px`;
        cursorDotRef.current.style.top = `${mouseRef.current.y}px`;
      }

      // Lagged follower update (smooth lerp 0.12)
      lagRef.current.x = lerp(lagRef.current.x, mouseRef.current.x, 0.12);
      lagRef.current.y = lerp(lagRef.current.y, mouseRef.current.y, 0.12);

      if (cursorFollowerRef.current) {
        cursorFollowerRef.current.style.left = `${lagRef.current.x}px`;
        cursorFollowerRef.current.style.top = `${lagRef.current.y}px`;
      }

      animFrame = requestAnimationFrame(updatePosition);
    };

    animFrame = requestAnimationFrame(updatePosition);

    // 2. Track Hover status on clickable items
    const updateInteractiveListeners = () => {
      const interactives = document.querySelectorAll('a, button, select, input, textarea, [role="button"], option, .interactive-hover');
      
      const handleEnter = () => setIsHovering(true);
      const handleLeave = () => setIsHovering(false);

      interactives.forEach(el => {
        el.addEventListener('mouseenter', handleEnter);
        el.addEventListener('mouseleave', handleLeave);
      });

      return () => {
        interactives.forEach(el => {
          el.removeEventListener('mouseenter', handleEnter);
          el.removeEventListener('mouseleave', handleLeave);
        });
      };
    };

    // Initial load
    let cleanClickables = updateInteractiveListeners();

    // Recheck DOM occasionally in case of route/view changes
    const mutationObserver = new MutationObserver(() => {
      if (cleanClickables) cleanClickables();
      cleanClickables = updateInteractiveListeners();
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeaveWindow);
      document.removeEventListener('mouseenter', handleMouseEnterWindow);
      cancelAnimationFrame(animFrame);
      document.documentElement.classList.remove('custom-cursor-active');
      mutationObserver.disconnect();
      if (cleanClickables) cleanClickables();
    };
  }, [isVisible]);

  // 3. Card tilt effect
  useEffect(() => {
    const handleCardTilt = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tiltCard = target.closest('.tilt-card') as HTMLElement;
      if (!tiltCard) return;

      const rect = tiltCard.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      // Restrict tilt intensity to a nice elegant max of 8deg
      const maxTilt = 8;
      const rotateX = -((y / rect.height) * maxTilt).toFixed(2);
      const rotateY = ((x / rect.width) * maxTilt).toFixed(2);

      tiltCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    };

    const handleCardReset = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tiltCard = target.closest('.tilt-card') as HTMLElement;
      if (!tiltCard) return;

      tiltCard.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    };

    // Use delegation for better dynamic performance
    document.addEventListener('mousemove', handleCardTilt);
    document.addEventListener('mouseout', handleCardReset);

    return () => {
      document.removeEventListener('mousemove', handleCardTilt);
      document.removeEventListener('mouseout', handleCardReset);
    };
  }, []);

  // 4. Scroll Reveal Intersection Observer
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1,
    };

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          
          // If it's a count-up stats element, trigger integer counting
          const countTargetAttr = entry.target.getAttribute('data-count-to');
          if (countTargetAttr) {
            const countTarget = parseFloat(countTargetAttr);
            const duration = 1200; // ms
            const startTime = performance.now();
            const startVal = 0;
            const element = entry.target as HTMLElement;
            const isFloat = countTargetAttr.includes('.') || element.getAttribute('data-count-float') === 'true';

            const animateCount = (timestamp: number) => {
              const elapsed = timestamp - startTime;
              const progress = Math.min(elapsed / duration, 1);
              
              // Easing out cubic
              const easeProgress = 1 - Math.pow(1 - progress, 3);
              const currentVal = startVal + easeProgress * (countTarget - startVal);
              
              if (isFloat) {
                // Determine precision
                const precision = element.getAttribute('data-count-precision') || '2';
                element.textContent = currentVal.toFixed(parseInt(precision, 10));
              } else {
                element.textContent = Math.floor(currentVal).toLocaleString();
              }

              if (progress < 1) {
                requestAnimationFrame(animateCount);
              } else {
                // Lock final value
                if (isFloat) {
                  const precision = element.getAttribute('data-count-precision') || '2';
                  element.textContent = countTarget.toFixed(parseInt(precision, 10));
                } else {
                  element.textContent = countTarget.toLocaleString();
                }
              }
            };
            requestAnimationFrame(animateCount);
            // Only count once per page-view
            observer.unobserve(entry.target);
          }
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersect, observerOptions);

    const setupObservers = () => {
      const scrollElements = document.querySelectorAll('.reveal-on-scroll, [data-count-to]');
      scrollElements.forEach(el => observer.observe(el));
    };

    setupObservers();

    // Check on mutations
    const mutationObserver = new MutationObserver(() => {
      setupObservers();
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  // Return render
  return (
    <>
      {isVisible && (
        <>
          <div 
            ref={cursorDotRef} 
            className="custom-cursor" 
            style={{ position: 'fixed', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 99999 }}
          />
          <div 
            ref={cursorFollowerRef} 
            className={`custom-cursor-follower ${isHovering ? 'hovering' : ''}`} 
            style={{ position: 'fixed', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 99998 }}
          />
        </>
      )}
    </>
  );
}
