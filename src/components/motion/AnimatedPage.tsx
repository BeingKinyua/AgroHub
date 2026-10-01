'use client';

import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

/**
 * Centralized GSAP Page Entrance & Scroll Reveal Wrapper.
 * Respects prefers-reduced-motion automatically.
 */
export function AnimatedPage({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (typeof window === 'undefined') return;
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

      if (prefersReducedMotion || !containerRef.current) return;

      const items = containerRef.current.querySelectorAll('[data-gsap-reveal]');
      if (items.length > 0) {
        gsap.fromTo(
          items,
          { opacity: 0, y: 10 },
          {
            opacity: 1,
            y: 0,
            duration: 0.32,
            stagger: 0.045,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
          }
        );
      } else {
        gsap.fromTo(
          containerRef.current,
          { opacity: 0, y: 8 },
          {
            opacity: 1,
            y: 0,
            duration: 0.26,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
          }
        );
      }
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

export function AnimatedSection({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (typeof window === 'undefined') return;
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

      if (prefersReducedMotion || !sectionRef.current) return;

      gsap.fromTo(
        sectionRef.current,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 92%',
            once: true,
          },
          clearProps: 'transform,opacity',
        }
      );
    },
    { scope: sectionRef }
  );

  return (
    <div ref={sectionRef} data-gsap-reveal className={className}>
      {children}
    </div>
  );
}
