import { render, userEvent } from '@testing-library/react-native';

import { ES } from '../i18n/es';
import { WelcomeScreen } from '@/screens/WelcomeScreen';

describe('<WelcomeScreen />', () => {
  test('presents the project purpose and reveals its safety principle', async () => {
    const screen = await render(<WelcomeScreen />);
    const user = userEvent.setup();

    screen.getByRole('header', { name: ES.welcome.title });
    const detailsButton = screen.getByRole('button', {
      name: ES.welcome.detailsButton,
    });

    expect(screen.queryByText(ES.welcome.details)).toBeNull();

    await user.press(detailsButton);

    await screen.findByText(ES.welcome.details);
  });
});
