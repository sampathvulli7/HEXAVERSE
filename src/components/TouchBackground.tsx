import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function TouchBackground() {
  const [mousePosition, setMousePosition] = useState({ x: -1000, y: -1000 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent | TouchEvent) => {
      let clientX, clientY;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }
      setMousePosition({ x: clientX, y: clientY });
      if (!isVisible) setIsVisible(true);
    };

    window.addEventListener('mousemove', updateMousePosition);
    window.addEventListener('touchmove', updateMousePosition);

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
      window.removeEventListener('touchmove', updateMousePosition);
    };
  }, [isVisible]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full blur-[120px] opacity-20 dark:opacity-10 mix-blend-multiply dark:mix-blend-screen"
        style={{
          background: 'radial-gradient(circle, rgba(147,197,253,0.8) 0%, rgba(196,181,253,0.3) 40%, transparent 80%)',
        }}
        animate={{
          x: mousePosition.x - 400,
          y: mousePosition.y - 400,
          opacity: isVisible ? 1 : 0
        }}
        transition={{ type: 'tween', ease: 'easeOut', duration: 0.6 }}
      />
    </div>
  );
}
