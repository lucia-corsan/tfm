import { render, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import {
  buildAdaptiveLearningProfileId,
  buildProfileFromAnswers,
  buildSpeechPreferencesFromAnswers,
  DEFAULT_ONBOARDING_ANSWERS,
  SKIPPED_ONBOARDING_ANSWERS,
} from '@/features/onboarding/answers';
import {
  loadOnboardingAnswers,
  saveOnboardingAnswers,
} from '@/features/onboarding/storage';
import type { PreferenceStorage } from '@/features/adaptive-preferences/storage';
import {
  isQuestionSkipped,
  ONBOARDING_QUESTION_COUNT,
  ONBOARDING_QUESTIONS,
} from '@/features/onboarding/questions';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { ES } from '../i18n/es';

let mockScreenReaderStatus = 'disabled';

jest.mock('@/features/speech/useScreenReaderStatus', () => ({
  useScreenReaderStatus: () => mockScreenReaderStatus,
}));

describe('configuración inicial', () => {
  beforeEach(() => {
    mockScreenReaderStatus = 'disabled';
  });

  test('el cuestionario tiene catorce preguntas', () => {
    expect(ONBOARDING_QUESTION_COUNT).toBe(14);
    expect(new Set(ONBOARDING_QUESTIONS.map((question) => question.id)).size).toBe(
      14,
    );
    expect(ONBOARDING_QUESTIONS.map((question) => question.id)).toEqual([
      'steps',
      'detour',
      'priority:distance',
      'priority:complex_crossings',
      'priority:crossing_support',
      'priority:sidewalk_evidence',
      'priority:surface',
      'priority:orientation_complexity',
      'priority:slope',
      'priority:uncertainty',
      'speech',
      'speechRate',
      'presentation',
      'learning',
    ]);
    expect(
      ONBOARDING_QUESTIONS.every(
        (question) =>
          question.title.trim().length > 0 &&
          (question.id === 'learning' || question.options.length > 0),
      ),
    ).toBe(true);
  });

  test('presenta el aviso de alcance antes de preguntar nada', async () => {
    const screen = await render(<OnboardingScreen onFinish={jest.fn()} />);

    screen.getByRole('header', { name: ES.onboarding.intro.title });
    screen.getByText(ES.onboarding.intro.storageNotice);
    screen.getByText(ES.onboarding.intro.evidenceNotice);
    screen.getByRole('button', { name: ES.onboarding.intro.continueButton });
    screen.getByRole('button', { name: ES.onboarding.intro.skipButton });
  });

  test('aplica el borrador visual y ofrece Ajustes antes de terminar el perfil', async () => {
    const onOpenSettings = jest.fn();
    const screen = await render(
      <OnboardingScreen
        initialAnswers={{
          ...DEFAULT_ONBOARDING_ANSWERS,
          presentation: 'both',
        }}
        onFinish={jest.fn()}
        onOpenSettings={onOpenSettings}
      />,
    );
    const user = userEvent.setup();
    const title = screen.getByRole('header', {
      name: ES.onboarding.intro.title,
    });
    const titleStyle = StyleSheet.flatten(title.props.style);

    expect(titleStyle.color).toBe('#000000');
    await user.press(
      screen.getByRole('button', { name: ES.settings.openButton }),
    );
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  test('omitir la configuración conserva el modo de perfiles generales', async () => {
    const onFinish = jest.fn();
    const screen = await render(<OnboardingScreen onFinish={onFinish} />);
    const user = userEvent.setup();

    await user.press(
      screen.getByRole('button', { name: ES.onboarding.intro.skipButton }),
    );

    expect(onFinish).toHaveBeenCalledWith(SKIPPED_ONBOARDING_ANSWERS);
  });

  test('la primera pregunta anuncia su posición y su opción marcada', async () => {
    const screen = await render(<OnboardingScreen onFinish={jest.fn()} />);
    const user = userEvent.setup();

    await user.press(
      screen.getByRole('button', { name: ES.onboarding.intro.continueButton }),
    );

    screen.getByRole('header', { name: ES.onboarding.appBarTitle });
    screen.getByText(ES.onboarding.progress(1, 14));
    screen.getByRole('header', { name: ES.onboarding.steps.title });
    screen.getByRole('radio', {
      name: ES.onboarding.steps.options.exclude,
      selected: true,
    });
    screen.getByRole('button', { name: ES.onboarding.nextButton });
  });

  test('la velocidad de la voz se omite con un lector de pantalla activo', () => {
    const speechRate = ONBOARDING_QUESTIONS.find(
      (question) => question.id === 'speechRate',
    );

    expect(speechRate).toBeDefined();
    expect(
      isQuestionSkipped(speechRate!, DEFAULT_ONBOARDING_ANSWERS, true),
    ).toBe(true);
    expect(
      isQuestionSkipped(speechRate!, DEFAULT_ONBOARDING_ANSWERS, false),
    ).toBe(false);
  });

  test('la velocidad se omite si las instrucciones solo se leen en pantalla', () => {
    const speechRate = ONBOARDING_QUESTIONS.find(
      (question) => question.id === 'speechRate',
    );

    expect(
      isQuestionSkipped(
        speechRate!,
        { ...DEFAULT_ONBOARDING_ANSWERS, speech: 'never' },
        false,
      ),
    ).toBe(true);
  });

  test('las respuestas producen un perfil con las restricciones críticas intactas', () => {
    const profile = buildProfileFromAnswers({
      ...DEFAULT_ONBOARDING_ANSWERS,
      detour: 'ten',
      priorities: {
        ...DEFAULT_ONBOARDING_ANSWERS.priorities,
        complex_crossings: 'high',
        distance: 'none',
      },
      steps: 'inform',
    });

    expect(profile.maximum_detour_ratio).toBeCloseTo(1.1);
    expect(profile.declared_weights.complex_crossings).toBeGreaterThan(
      profile.declared_weights.distance,
    );
    expect(profile.declared_weights.distance).toBe(0);
    expect(profile.avoid_steps).toBe(false);
    expect(profile.require_pedestrian_access).toBe(true);
    expect(profile.avoid_incompatible_crossings).toBe(true);
  });

  test('excluir escalones mantiene la restricción crítica activa', () => {
    const profile = buildProfileFromAnswers(DEFAULT_ONBOARDING_ANSWERS);

    expect(profile.avoid_steps).toBe(true);
    expect(profile.declared_weights.steps).toBeGreaterThan(0);
  });

  test('traduce las prioridades a una escala ordinal sencilla de cero a tres', () => {
    const profile = buildProfileFromAnswers({
      ...DEFAULT_ONBOARDING_ANSWERS,
      priorities: {
        ...DEFAULT_ONBOARDING_ANSWERS.priorities,
        complex_crossings: 'high',
        crossing_support: 'low',
        distance: 'none',
        surface: 'medium',
      },
    });

    expect(profile.declared_weights.distance).toBe(0);
    expect(profile.declared_weights.crossing_support).toBe(1);
    expect(profile.declared_weights.surface).toBe(2);
    expect(profile.declared_weights.complex_crossings).toBe(3);
  });

  test('recupera un perfil equilibrado si todas las prioridades quedan a cero', () => {
    const profile = buildProfileFromAnswers({
      ...DEFAULT_ONBOARDING_ANSWERS,
      priorities: Object.fromEntries(
        Object.keys(DEFAULT_ONBOARDING_ANSWERS.priorities).map((dimension) => [
          dimension,
          'none',
        ]),
      ) as typeof DEFAULT_ONBOARDING_ANSWERS.priorities,
      steps: 'inform',
    });

    expect(new Set(Object.values(profile.declared_weights))).toEqual(
      new Set([1]),
    );
  });

  test('aplica a la navegación la voz, su velocidad y la opción sin voz', () => {
    expect(
      buildSpeechPreferencesFromAnswers({
        ...DEFAULT_ONBOARDING_ANSWERS,
        speech: 'automatic',
        speechRate: 'fast',
      }),
    ).toEqual({ automaticPlayback: true, enabled: true, rateId: 'fast' });
    expect(
      buildSpeechPreferencesFromAnswers({
        ...DEFAULT_ONBOARDING_ANSWERS,
        speech: 'never',
      }),
    ).toEqual({ automaticPlayback: false, enabled: false, rateId: 'normal' });
  });

  test('el aprendizaje distingue restricciones, pero no ajustes visuales o de voz', () => {
    const baseId = buildAdaptiveLearningProfileId(DEFAULT_ONBOARDING_ANSWERS);
    const visualId = buildAdaptiveLearningProfileId({
      ...DEFAULT_ONBOARDING_ANSWERS,
      presentation: 'both',
      speech: 'automatic',
      speechRate: 'fast',
    });
    const differentRestrictionId = buildAdaptiveLearningProfileId({
      ...DEFAULT_ONBOARDING_ANSWERS,
      detour: 'ten',
      steps: 'inform',
    });

    expect(visualId).toBe(baseId);
    expect(differentRestrictionId).not.toBe(baseId);
  });

  test('guarda y recupera las respuestas completas en el almacenamiento local', async () => {
    const values = new Map<string, string>();
    const storage: PreferenceStorage = {
      getItem: async (key) => values.get(key) ?? null,
      removeItem: async (key) => {
        values.delete(key);
      },
      setItem: async (key, value) => {
        values.set(key, value);
      },
    };
    const answers = {
      ...DEFAULT_ONBOARDING_ANSWERS,
      adaptiveLearning: true,
      detour: 'twentyFive' as const,
    };

    await saveOnboardingAnswers(storage, answers);

    await expect(loadOnboardingAnswers(storage)).resolves.toEqual(answers);
    expect([...values.values()].join('')).not.toMatch(
      /latitude|longitude|address|audio|gps/i,
    );
  });

  test('ignora un perfil local incompleto o manipulado', async () => {
    const storage: PreferenceStorage = {
      getItem: async () => JSON.stringify({ version: 1, answers: {} }),
      removeItem: async () => undefined,
      setItem: async () => undefined,
    };

    await expect(loadOnboardingAnswers(storage)).resolves.toBeNull();
  });

  test('migra un perfil anterior como personalizado sin perder respuestas', async () => {
    const { profileMode: _profileMode, ...legacyAnswers } =
      DEFAULT_ONBOARDING_ANSWERS;
    const storage: PreferenceStorage = {
      getItem: async () =>
        JSON.stringify({ version: 1, answers: legacyAnswers }),
      removeItem: async () => undefined,
      setItem: async () => undefined,
    };

    await expect(loadOnboardingAnswers(storage)).resolves.toEqual(
      DEFAULT_ONBOARDING_ANSWERS,
    );
  });
});
