import { fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { AdaptivePreferencesPanel } from '@/components/AdaptivePreferencesPanel';
import { initializeLearning } from '@/features/adaptive-preferences/learner';
import { ES } from '../i18n/es';

const declaredWeights = {
  distance: 1,
  complex_crossings: 1,
  crossing_support: 1,
  sidewalk_evidence: 1,
  steps: 1,
  surface: 1,
  orientation_complexity: 1,
  slope: 1,
  uncertainty: 1,
};

describe('<AdaptivePreferencesPanel />', () => {
  test('expone un consentimiento explícito y accesible', async () => {
    const onSetEnabled = jest.fn().mockResolvedValue(undefined);
    const screen = await render(
      <AdaptivePreferencesPanel
        learningState={initializeLearning(declaredWeights)}
        onReset={jest.fn()}
        onSetEnabled={onSetEnabled}
        recoveredFromInvalidData={false}
        status="ready"
      />,
    );

    const learningSwitch = screen.getByRole('switch', {
      name: ES.adaptivePreferences.switchLabel,
      checked: false,
    });
    fireEvent(learningSwitch, 'valueChange', true);

    expect(onSetEnabled).toHaveBeenCalledWith(true);
    screen.getByText(ES.adaptivePreferences.disabledStatus);
    screen.getByText(ES.adaptivePreferences.privacy);
  });

  test('pide confirmación antes de borrar el estado aprendido', async () => {
    const onReset = jest.fn().mockResolvedValue(undefined);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const state = {
      ...initializeLearning(declaredWeights, undefined, true),
      choiceCount: 4,
    };
    const screen = await render(
      <AdaptivePreferencesPanel
        learningState={state}
        onReset={onReset}
        onSetEnabled={jest.fn()}
        recoveredFromInvalidData={false}
        status="ready"
      />,
    );

    fireEvent.press(
      screen.getByRole('button', {
        name: ES.adaptivePreferences.resetButton,
      }),
    );

    expect(alert).toHaveBeenCalledWith(
      ES.adaptivePreferences.resetDialogTitle,
      ES.adaptivePreferences.resetDialogDescription,
      expect.arrayContaining([
        expect.objectContaining({
          text: ES.adaptivePreferences.confirmResetButton,
          style: 'destructive',
        }),
      ]),
    );
    expect(onReset).not.toHaveBeenCalled();
    alert.mockRestore();
  });
});
