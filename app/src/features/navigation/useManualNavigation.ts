import { useCallback, useMemo, useState } from 'react';

import type { ComparedRoute, NavigationInstruction } from '@/api/types';

interface ManualNavigationController {
  canGoNext: boolean;
  canGoPrevious: boolean;
  currentIndex: number;
  currentInstruction: NavigationInstruction;
  goNext: () => void;
  goPrevious: () => void;
  totalInstructions: number;
}

export function useManualNavigation(
  route: ComparedRoute,
): ManualNavigationController {
  const [currentIndex, setCurrentIndex] = useState(0);
  const totalInstructions = route.instructions.length;
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < totalInstructions - 1;

  const goPrevious = useCallback(() => {
    setCurrentIndex((index) => Math.max(index - 1, 0));
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((index) => Math.min(index + 1, totalInstructions - 1));
  }, [totalInstructions]);

  return useMemo(
    () => ({
      canGoNext,
      canGoPrevious,
      currentIndex,
      currentInstruction: route.instructions[currentIndex],
      goNext,
      goPrevious,
      totalInstructions,
    }),
    [
      canGoNext,
      canGoPrevious,
      currentIndex,
      goNext,
      goPrevious,
      route.instructions,
      totalInstructions,
    ],
  );
}
