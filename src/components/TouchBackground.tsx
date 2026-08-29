import React, { useEffect, useState, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/**
 * Animated background — fixed full-viewport wrapper at z-0.
 * Contains: interactive canvas particle grid + 3 drifting gradient blobs.
 * Parallax: Blobs subtly react to cursor movement (desktop only).
 * Canvas: Dots are pushed away and brighten near the cursor (desktop only).
 */
export function TouchBackground({ isDarkMode = false }: { isDarkMode?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Motion values for blob parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for the parallax offset
  const springConfig = { damping: 30, stiffness: 100, mass: 1 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  const [isTouch, setIsTouch] = useState(false);

  // --- CANVAS PARTICLE GRID LOGIC ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const touchDevice = window.matchMedia('(pointer: coarse)').matches;
    setIsTouch(touchDevice);

    let width = 0;
    let height = 0;
    let particles: { x: number; y: number; baseX: number; baseY: number }[] = [];
    
    // Configuration
    const SPACING = 24;
    const RADIUS = 1.5;
    const BASE_OPACITY = touchDevice ? (isDarkMode ? 0.08 : 0.15) : 0.15; 
    const MAX_OPACITY = 0.7;
    const INTERACT_RADIUS = 150;
    const REPULSION = 10;
    
    let pointer = { x: -1000, y: -1000 };
    let animationFrameId: number;
    let idleFrames = 0;
    let isAnimating = false;

    // Build the grid of particles
    const initParticles = () => {
      particles = [];
      const cols = Math.ceil(width / SPACING) + 1;
      const rows = Math.ceil(height / SPACING) + 1;
      
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * SPACING;
          const y = j * SPACING;
          particles.push({ x, y, baseX: x, baseY: y });
        }
      }
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      
      // Handle high DPI displays
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      initParticles();
      
      // If touch device or idle, we still need to draw at least once after resize
      if (!isAnimating) {
        drawFrame();
      }
    };

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);

      const colorRGB = isDarkMode ? '255, 255, 255' : '0, 0, 0';

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        let opacity = BASE_OPACITY;
        let drawX = p.baseX;
        let drawY = p.baseY;

        if (!touchDevice) {
          const dx = pointer.x - p.baseX;
          const dy = pointer.y - p.baseY;
          const distSq = dx * dx + dy * dy;
          const interactSq = INTERACT_RADIUS * INTERACT_RADIUS;

          if (distSq < interactSq) {
            const dist = Math.sqrt(distSq);
            // Normalized distance (0 at center, 1 at edge of interaction radius)
            const force = 1 - (dist / INTERACT_RADIUS);
            
            // Push away
            const angle = Math.atan2(dy, dx);
            const push = force * REPULSION;
            
            // Easing the particle towards its target position
            const targetX = p.baseX - Math.cos(angle) * push;
            const targetY = p.baseY - Math.sin(angle) * push;
            
            p.x += (targetX - p.x) * 0.2;
            p.y += (targetY - p.y) * 0.2;
            
            opacity = BASE_OPACITY + (MAX_OPACITY - BASE_OPACITY) * force;
          } else {
            // Return to base position
            p.x += (p.baseX - p.x) * 0.1;
            p.y += (p.baseY - p.y) * 0.1;
          }
          
          drawX = p.x;
          drawY = p.y;
        }

        ctx.beginPath();
        ctx.arc(drawX, drawY, RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${colorRGB}, ${opacity})`;
        ctx.fill();
      }

      if (touchDevice) return; // Touch devices draw once and stop

      if (idleFrames < 120) { // 2 seconds of idle animation before pausing
        idleFrames++;
        animationFrameId = requestAnimationFrame(drawFrame);
      } else {
        isAnimating = false;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      idleFrames = 0; // Reset idle timer
      
      // Update blob parallax tracking
      const deltaX = e.clientX - window.innerWidth / 2;
      const deltaY = e.clientY - window.innerHeight / 2;
      mouseX.set(deltaX);
      mouseY.set(deltaY);

      if (!isAnimating && !touchDevice) {
        isAnimating = true;
        drawFrame();
      }
    };

    if (!touchDevice) {
      window.addEventListener('mousemove', handleMouseMove);
      // Start initial loop
      isAnimating = true;
      drawFrame();
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (!touchDevice) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isDarkMode, mouseX, mouseY]); // Re-run effect if theme changes to update color

  // Helper to map mouse delta to a capped offset for parallax blobs
  const createOffset = (value: number, factor: number, max: number) => {
    const raw = value * factor;
    return Math.max(Math.min(raw, max), -max);
  };

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden touch-bg-wrapper transition-colors duration-300"
      style={{ zIndex: 0 }}
    >
      {/* 
        The canvas particle grid is layered behind the blobs (if blobs were z-1) 
        Actually, we render canvas at z-1, blobs at z-0, or vice versa depending on preference.
        Since blobs are glowing backdrops, putting canvas on top of blobs looks more distinct.
      */}
      <div className="blob-container absolute inset-0 z-0">
        <div className="blob blob-1">
          {!isTouch ? (
            <motion.div 
              className="w-full h-full rounded-full bg-[var(--blob-1-color)]"
              style={{
                x: springX,
                y: springY,
                transformTemplate: (_, generated) => {
                  return `translate(${createOffset(springX.get(), 0.02, 30)}px, ${createOffset(springY.get(), 0.02, 30)}px)`;
                }
              }}
            />
          ) : (
            <div className="w-full h-full rounded-full bg-[var(--blob-1-color)]" />
          )}
        </div>

        <div className="blob blob-2">
          {!isTouch ? (
            <motion.div 
              className="w-full h-full rounded-full bg-[var(--blob-2-color)]"
              style={{
                x: springX,
                y: springY,
                transformTemplate: (_, generated) => {
                  return `translate(${createOffset(springX.get(), 0.035, 30)}px, ${createOffset(springY.get(), 0.035, 30)}px)`;
                }
              }}
            />
          ) : (
            <div className="w-full h-full rounded-full bg-[var(--blob-2-color)]" />
          )}
        </div>

        <div className="blob blob-3">
          {!isTouch ? (
            <motion.div 
              className="w-full h-full rounded-full bg-[var(--blob-3-color)]"
              style={{
                x: springX,
                y: springY,
                transformTemplate: (_, generated) => {
                  return `translate(${createOffset(springX.get(), 0.05, 30)}px, ${createOffset(springY.get(), 0.05, 30)}px)`;
                }
              }}
            />
          ) : (
            <div className="w-full h-full rounded-full bg-[var(--blob-3-color)]" />
          )}
        </div>
      </div>

      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-300" 
      />
    </div>
  );
}
