import { useCallback, useMemo, useState } from 'react';

import type { ComparedRoute, NavigationInstruction } from '@/api/types';
import type { LocationSample } from '@/features/location/deviationDetector';
import { distanceBetweenPointsMetres } from '@/features/location/geo';

export const AUTO_ADVANCE_DISTANCE_M = 15;
export const AUTO_ADVANCE_MAXIMUM_ACCURACY_M = 15;

interface ManualNavigationController {
  canGoNext: boolean;
  canGoPrevious: boolean;
  currentIndex: number;
  currentInstruction: NavigationInstruction;
  goNext: () => void;
  goPrevious: () => void;
  handleReliableLocation: (sample: LocationSample) => void;
  resetToFirstInstruction: () => void;
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

  const resetToFirstInstruction = useCallback(() => {
    setCurrentIndex(0);
  }, []);

  const handleReliableLocation = useCallback(
    (sample: LocationSample) => {
      if (sample.accuracyM > AUTO_ADVANCE_MAXIMUM_ACCURACY_M) {
        return;
      }
      setCurrentIndex((index) => {
        const nextInstruction = route.instructions[index + 1];
        if (
          nextInstruction &&
          distanceBetweenPointsMetres(sample, nextInstruction.location) <=
            AUTO_ADVANCE_DISTANCE_M
        ) {
          return index + 1;
        }
        return index;
      });
    },
    [route.instructions],
  );

  return useMemo(
    () => ({
      canGoNext,
      canGoPrevious,
      currentIndex,
      currentInstruction: route.instructions[currentIndex],
      goNext,
      goPrevious,
      handleReliableLocation,
      resetToFirstInstruction,
      totalInstructions,
    }),
    [
      canGoNext,
      canGoPrevious,
      currentIndex,
      goNext,
      goPrevious,
      handleReliableLocation,
      route.instructions,
      resetToFirstInstruction,
      totalInstructions,
    ],
  );
}
