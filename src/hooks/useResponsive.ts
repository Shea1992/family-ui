import { useState, useEffect } from 'react';

export interface ResponsiveInfo {
  isMobile: boolean;   // <= 768px (手机)
  isTablet: boolean;   // 769px ~ 1024px (平板)
  isDesktop: boolean;  // > 1024px (桌面)
  width: number;
}

export function useResponsive(): ResponsiveInfo {
  const [info, setInfo] = useState<ResponsiveInfo>(() => calcInfo());

  function calcInfo(): ResponsiveInfo {
    const w = window.innerWidth;
    return {
      isMobile: w <= 768,
      isTablet: w > 768 && w <= 1024,
      isDesktop: w > 1024,
      width: w,
    };
  }

  useEffect(() => {
    let rafId: number;
    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setInfo(calcInfo()));
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return info;
}
