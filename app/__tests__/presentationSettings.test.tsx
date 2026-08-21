import { render, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { AccessibleText } from '@/components/AccessibleText';
import {
  DEFAULT_ONBOARDING_ANSWERS,
  SKIPPED_ONBOARDING_ANSWERS,
} from '@/features/onboarding/answers';
import { OnboardingQuestionEditorScreen } from '@/screens/OnboardingQuestionEditorScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { PresentationProvider, typography } from '@/theme';
import { ES } from '../i18n/es';

describe('presentación visual y ajustes', () => {
  test('el modo de texto grande aumenta tamaño e interlineado', async () => {
    const screen = await render(
      <PresentationProvider mode="largeText">
        <AccessibleText>Texto de comprobación</AccessibleText>
      </PresentationProvider>,
    );

    const style = StyleSheet.flatten(
      screen.getByText('Texto de comprobación').props.style,
    );
    expect(style.fontSize).toBeGreaterThan(typography.body.fontSize);
    expect(style.lineHeight).toBeGreaterThan(typography.body.lineHeight);
  });

  test('el contraste reforzado utiliza negro para el texto principal', async () => {
    const screen = await render(
      <PresentationProvider mode="highContrast">
        <AccessibleText>Texto contrastado</AccessibleText>
      </PresentationProvider>,
    );

    const style = StyleSheet.flatten(
      screen.getByText('Texto contrastado').props.style,
    );
    expect(style.color).toBe('#000000');
  });

  test('Ajustes muestra resúmenes y abre editores sin controles directos', async () => {
    const onEditQuestion = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <PresentationProvider mode="system">
        <SettingsScreen
          answers={DEFAULT_ONBOARDING_ANSWERS}
          onBack={jest.fn()}
          onEditQuestion={onEditQuestion}
          onEditProfile={jest.fn()}
        />
      </PresentationProvider>,
    );

    await user.press(
      screen.getByRole('button', {
        name: ES.settings.presentation.editButton,
      }),
    );
    expect(onEditQuestion).toHaveBeenCalledWith('presentation');
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.queryAllByRole('switch')).toHaveLength(0);
    screen.getByText(
      ES.settings.currentValue(
        ES.onboarding.presentation.options.system,
      ),
    );
  });

  test('el editor aplica la vista previa y solo guarda al confirmar', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <OnboardingQuestionEditorScreen
        answers={DEFAULT_ONBOARDING_ANSWERS}
        onBack={jest.fn()}
        onSave={onSave}
        questionId="presentation"
      />,
    );
    const initialStyle = StyleSheet.flatten(
      screen.getByRole('header', {
        name: ES.onboarding.presentation.title,
      }).props.style,
    );
    await user.press(
      screen.getByRole('radio', {
        name: ES.onboarding.presentation.options.largeText,
      }),
    );
    const updatedStyle = StyleSheet.flatten(
      screen.getByRole('header', {
        name: ES.onboarding.presentation.title,
      }).props.style,
    );
    expect(updatedStyle.fontSize).toBeGreaterThan(initialStyle.fontSize);
    expect(onSave).not.toHaveBeenCalled();
    await user.press(
      screen.getByRole('button', { name: ES.settings.editor.saveButton }),
    );
    expect(onSave).toHaveBeenCalledWith({
      ...DEFAULT_ONBOARDING_ANSWERS,
      presentation: 'largeText',
    });
  });

  test('el retroceso general de Ajustes mantiene el fondo transparente', async () => {
    const screen = await render(
      <SettingsScreen
        answers={DEFAULT_ONBOARDING_ANSWERS}
        onBack={jest.fn()}
        onEditQuestion={jest.fn()}
        onEditProfile={jest.fn()}
      />,
    );
    const backStyle = StyleSheet.flatten(
      screen.getByRole('button', { name: ES.settings.backButton }).props.style,
    );
    expect(backStyle.backgroundColor).toBe('transparent');
  });

  test('Ajustes permite añadir lugares y muestra el estado vacío', async () => {
    const screen = await render(
      <SettingsScreen
        answers={DEFAULT_ONBOARDING_ANSWERS}
        onBack={jest.fn()}
        onEditQuestion={jest.fn()}
        onEditProfile={jest.fn()}
      />,
    );

    screen.getByRole('header', { name: ES.settings.favorites.title });
    screen.getByText(ES.settings.favorites.empty);
    screen.getByRole('button', { name: ES.settings.favorites.addButton });
  });

  test('Ajustes abre por separado las preguntas de uso y velocidad de voz', async () => {
    const onEditQuestion = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <SettingsScreen
          answers={DEFAULT_ONBOARDING_ANSWERS}
          onBack={jest.fn()}
          onEditQuestion={onEditQuestion}
          onEditProfile={jest.fn()}
      />,
    );

    await user.press(
      screen.getByRole('button', {
        name: ES.settings.speech.editModeButton,
      }),
    );
    expect(onEditQuestion).toHaveBeenCalledWith('speech');
    await user.press(
      screen.getByRole('button', {
        name: ES.settings.speech.editRateButton,
      }),
    );
    expect(onEditQuestion).toHaveBeenCalledWith('speechRate');
  });

  test('Ajustes explica el modo general y no mezcla su aprendizaje con el perfil personal', async () => {
    const screen = await render(
      <SettingsScreen
        answers={SKIPPED_ONBOARDING_ANSWERS}
        onBack={jest.fn()}
        onEditQuestion={jest.fn()}
        onEditProfile={jest.fn()}
      />,
    );

    screen.getByRole('button', {
      name: ES.settings.routePreferences.genericButton,
    });
    screen.getByText(ES.settings.learning.genericNotice);
    expect(
      screen.queryByRole('switch', {
        name: ES.settings.learning.switchLabel,
      }),
    ).toBeNull();
  });
});
