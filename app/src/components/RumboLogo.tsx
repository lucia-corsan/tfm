import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme';

interface RumboLogoProps {
  animated?: boolean;
  color?: string;
  size?: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const CURVE_DURATION_MS = 1600;
const CURVE_DELAY_MS = 550;
const DOT_DURATION_MS = 500;
const LOGO_PATH_LENGTH = 67.34;

/**
 * Marca de la aplicación.
 *
 * Es decorativa: el nombre siempre acompaña al símbolo como texto, así que se
 * oculta al lector de pantalla para no duplicar la locución.
 */
export function RumboLogo({
  animated = false,
  color = colors.brand,
  size = 32,
}: RumboLogoProps) {
  const [strokeOffset] = useState(() => new Animated.Value(0));
  const [dotOpacity] = useState(() => new Animated.Value(1));
  const [dotRadius] = useState(() => new Animated.Value(3.6));

  useEffect(() => {
    if (!animated) {
      return;
    }

    let cancelled = false;
    let currentAnimation: Animated.CompositeAnimation | null = null;

    const showFinishedLogo = () => {
      currentAnimation?.stop();
      strokeOffset.setValue(0);
      dotOpacity.setValue(1);
      dotRadius.setValue(3.6);
    };

    const startAnimation = async () => {
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
      if (cancelled) {
        return;
      }
      if (reduceMotion) {
        showFinishedLogo();
        return;
      }

      strokeOffset.setValue(-LOGO_PATH_LENGTH);
      dotOpacity.setValue(0);
      dotRadius.setValue(0);

      currentAnimation = Animated.parallel([
        Animated.sequence([
          Animated.parallel([
            Animated.timing(dotOpacity, {
              duration: DOT_DURATION_MS * 0.6,
              easing: Easing.out(Easing.quad),
              toValue: 1,
              useNativeDriver: false,
            }),
            Animated.timing(dotRadius, {
              duration: DOT_DURATION_MS * 0.6,
              easing: Easing.out(Easing.back(1.56)),
              toValue: 4.5,
              useNativeDriver: false,
            }),
          ]),
          Animated.timing(dotRadius, {
            duration: DOT_DURATION_MS * 0.4,
            easing: Easing.out(Easing.quad),
            toValue: 3.6,
            useNativeDriver: false,
          }),
        ]),
        Animated.timing(strokeOffset, {
          delay: CURVE_DELAY_MS,
          duration: CURVE_DURATION_MS,
          easing: Easing.bezier(0.65, 0, 0.35, 1),
          toValue: 0,
          useNativeDriver: false,
        }),
      ]);
      currentAnimation.start();
    };

    void startAnimation();
    const reduceMotionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (reduceMotionEnabled) => {
        if (reduceMotionEnabled) {
          showFinishedLogo();
        } else {
          void startAnimation();
        }
      },
    );

    return () => {
      cancelled = true;
      currentAnimation?.stop();
      reduceMotionSubscription.remove();
    };
  }, [animated, dotOpacity, dotRadius, strokeOffset]);

  return (
    <Svg
      accessibilityElementsHidden
      focusable={false}
      height={size}
      importantForAccessibility="no-hide-descendants"
      viewBox="0 0 40 40"
      width={size}
    >
      <AnimatedPath
        d="M10 30 C10 12 26 12 26 30 C26 36 10 36 10 12"
        fill="none"
        stroke={color}
        strokeDasharray={LOGO_PATH_LENGTH}
        strokeDashoffset={strokeOffset}
        strokeLinecap="round"
        strokeWidth={5}
      />
      <AnimatedCircle
        cx={10}
        cy={12}
        fill={color}
        opacity={dotOpacity}
        r={dotRadius}
      />
    </Svg>
  );
}
