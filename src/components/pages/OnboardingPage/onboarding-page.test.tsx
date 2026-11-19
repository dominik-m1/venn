import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw/http';
import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { API_BASE_URL } from '@/config';
import { testProfile } from '@/test/mocks/handlers';
import { server } from '@/test/mocks/server';
import { OnboardingPage } from '.';

const labels = {
  firstName: 'First Name',
  lastName: 'Last Name',
  phone: 'Phone Number',
  corporationNumber: 'Corporation Number',
};
const progress = () => screen.getByRole('progressbar');
const next = () => screen.getByRole('button', { name: 'Continue' });
const back = () => screen.getByRole('button', { name: 'Back' });
const nextStep = () => screen.getByRole('button', { name: 'Next step' });
const previousStep = () =>
  screen.getByRole('button', { name: 'Previous step' });

function fill() {
  for (const key of Object.keys(labels) as (keyof typeof labels)[]) {
    fireEvent.change(screen.getByLabelText(labels[key]), {
      target: { value: testProfile[key] },
    });
  }
}

function renderOnboarding() {
  return render(<OnboardingPage />, { wrapper: StrictMode });
}

async function submitProfile() {
  fill();
  fireEvent.submit(screen.getByRole('form'));
  await screen.findByRole('heading', { name: 'Step 2' });
}

it('starts on the profile and blocks advancement until validation succeeds', () => {
  renderOnboarding();
  expect(progress()).toHaveTextContent('Step 1 of 5');
  expect(screen.getByRole('heading')).not.toHaveFocus();
  expect(previousStep()).toBeDisabled();
  expect(nextStep()).toBeEnabled();
  expect(
    screen.queryByRole('button', { name: 'Back' }),
  ).not.toBeInTheDocument();
  fireEvent.click(nextStep());
  expect(progress()).toHaveTextContent('Step 1 of 5');
  expect(screen.getByLabelText('First Name')).toHaveFocus();
});

it('uses the arrows to submit, move between every step, and preserve profile details', async () => {
  const post = jest.fn(() => new HttpResponse(null, { status: 200 }));
  server.use(http.post(`${API_BASE_URL}/profile-details`, post));
  renderOnboarding();
  const user = userEvent.setup();
  fill();
  await user.click(nextStep());
  await screen.findByRole('heading', { name: 'Step 2' });
  for (let step = 3; step <= 5; step++) {
    await user.click(nextStep());
    expect(progress()).toHaveTextContent(`Step ${step} of 5`);
    expect(screen.getByRole('heading', { name: `Step ${step}` })).toHaveFocus();
  }
  expect(nextStep()).toBeDisabled();
  await user.click(nextStep());
  expect(progress()).toHaveTextContent('Step 5 of 5');
  for (let step = 4; step >= 1; step--) {
    await user.click(previousStep());
    expect(progress()).toHaveTextContent(`Step ${step} of 5`);
  }
  expect(previousStep()).toBeDisabled();
  expect(
    screen.getByRole('heading', { name: 'Onboarding Form' }),
  ).toHaveFocus();
  for (const key of Object.keys(labels) as (keyof typeof labels)[]) {
    expect(screen.getByLabelText(labels[key])).toHaveValue(testProfile[key]);
  }
  await user.click(previousStep());
  expect(progress()).toHaveTextContent('Step 1 of 5');
  await user.click(nextStep());
  expect(progress()).toHaveTextContent('Step 2 of 5');
  expect(post).toHaveBeenCalledTimes(1);
});

it('disables the arrows during verification and submission and prevents duplicate requests', async () => {
  const verification = Promise.withResolvers<void>();
  const submission = Promise.withResolvers<void>();
  const get = jest.fn(async () => {
    await verification.promise;
    return HttpResponse.json({ valid: true });
  });
  const post = jest.fn(async () => {
    await submission.promise;
    return new HttpResponse(null, { status: 200 });
  });
  server.use(
    http.get(`${API_BASE_URL}/corporation-number/:number`, get),
    http.post(`${API_BASE_URL}/profile-details`, post),
  );
  renderOnboarding();
  fill();
  fireEvent.click(nextStep());
  expect(previousStep()).toBeDisabled();
  expect(nextStep()).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Validating…' })).toBeDisabled();
  fireEvent.click(nextStep());
  fireEvent.submit(screen.getByRole('form'));
  expect(post).not.toHaveBeenCalled();
  await act(async () => verification.resolve());
  await screen.findByRole('button', { name: 'Submitting…' });
  expect(nextStep()).toBeDisabled();
  fireEvent.click(nextStep());
  fireEvent.submit(screen.getByRole('form'));
  await act(async () => submission.resolve());
  await screen.findByRole('heading', { name: 'Step 2' });
  expect(previousStep()).toBeEnabled();
  expect(nextStep()).toBeEnabled();
  expect(get).toHaveBeenCalledTimes(1);
  expect(post).toHaveBeenCalledTimes(1);
});

it('keeps the profile accessible when the forward arrow fails corporation verification', async () => {
  const post = jest.fn(() => new HttpResponse(null, { status: 200 }));
  server.use(http.post(`${API_BASE_URL}/profile-details`, post));
  renderOnboarding();
  fill();
  fireEvent.change(screen.getByLabelText('Corporation Number'), {
    target: { value: '000000000' },
  });
  await userEvent.setup().click(nextStep());
  await screen.findByText('Invalid corporation number');
  expect(progress()).toHaveTextContent('Step 1 of 5');
  expect(nextStep()).toBeEnabled();
  expect(screen.getByLabelText('Corporation Number')).toHaveFocus();
  expect(post).not.toHaveBeenCalled();
});

it('preserves raw edits across an immediate remount without persisting errors', () => {
  const view = renderOnboarding();
  fill();
  fireEvent.change(screen.getByLabelText('First Name'), {
    target: { value: ' Eva ' },
  });
  fireEvent.change(screen.getByLabelText('Corporation Number'), {
    target: { value: '000' },
  });
  fireEvent.blur(screen.getByLabelText('Corporation Number'));
  expect(screen.getByText(/must be exactly 9/)).toBeVisible();
  view.unmount();
  renderOnboarding();
  expect(screen.getByLabelText('First Name')).toHaveValue(' Eva ');
  expect(screen.getByLabelText('Corporation Number')).toHaveValue('000');
  expect(screen.getByLabelText('Phone Number')).toHaveValue(testProfile.phone);
  expect(screen.queryByText(/must be exactly 9/)).not.toBeInTheDocument();
  expect(progress()).toHaveTextContent('Step 1 of 5');
});

it('navigates through placeholders, focuses headings, and stops at the last step', async () => {
  renderOnboarding();
  const user = userEvent.setup();
  await submitProfile();
  expect(progress()).toHaveTextContent('Step 2 of 5');
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: 'Step 2' })).toHaveFocus(),
  );
  expect(screen.getByText('This step is not available yet.')).toBeVisible();
  await user.click(next());
  expect(progress()).toHaveTextContent('Step 3 of 5');
  expect(screen.getByRole('heading', { name: 'Step 3' })).toHaveFocus();
  await user.click(back());
  expect(progress()).toHaveTextContent('Step 2 of 5');
  expect(screen.getByRole('heading', { name: 'Step 2' })).toHaveFocus();
  for (let count = 0; count < 3; count++) {
    await user.click(next());
  }
  expect(progress()).toHaveTextContent('Step 5 of 5');
  expect(
    screen.queryByRole('button', { name: 'Continue' }),
  ).not.toBeInTheDocument();
  expect(back()).toBeEnabled();
});

it('restores the current placeholder and avoids resubmitting unchanged details after Back', async () => {
  const post = jest.fn(() => new HttpResponse(null, { status: 200 }));
  server.use(http.post(`${API_BASE_URL}/profile-details`, post));
  const view = renderOnboarding();
  const user = userEvent.setup();
  await submitProfile();
  await user.click(nextStep());
  view.unmount();
  renderOnboarding();
  expect(progress()).toHaveTextContent('Step 3 of 5');
  await user.click(previousStep());
  await user.click(previousStep());
  expect(
    screen.getByRole('heading', { name: 'Onboarding Form' }),
  ).toHaveFocus();
  expect(screen.getByLabelText('First Name')).toHaveValue(
    testProfile.firstName,
  );
  await user.click(nextStep());
  expect(progress()).toHaveTextContent('Step 2 of 5');
  expect(post).toHaveBeenCalledTimes(1);
});

it('requires another validated submission after editing a submitted profile', async () => {
  const post = jest.fn(() => new HttpResponse(null, { status: 200 }));
  server.use(http.post(`${API_BASE_URL}/profile-details`, post));
  renderOnboarding();
  const user = userEvent.setup();
  await submitProfile();
  await user.click(previousStep());
  await user.clear(screen.getByLabelText('First Name'));
  await user.click(nextStep());
  expect(progress()).toHaveTextContent('Step 1 of 5');
  expect(post).toHaveBeenCalledTimes(1);
  await user.type(screen.getByLabelText('First Name'), 'Eva');
  expect(screen.getByLabelText('First Name')).toHaveFocus();
  await user.click(nextStep());
  await screen.findByRole('heading', { name: 'Step 2' });
  expect(post).toHaveBeenCalledTimes(2);
});

it('retains the draft on POST failure and never advances automatically', async () => {
  server.use(
    http.post(`${API_BASE_URL}/profile-details`, () => HttpResponse.error()),
  );
  const view = renderOnboarding();
  fill();
  fireEvent.click(nextStep());
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent(
      'It may have been received.',
    ),
  );
  expect(progress()).toHaveTextContent('Step 1 of 5');
  view.unmount();
  renderOnboarding();
  expect(screen.getByLabelText('First Name')).toHaveValue(
    testProfile.firstName,
  );
  expect(progress()).toHaveTextContent('Step 1 of 5');
});

it('keeps the flow usable when browser storage is unavailable', async () => {
  jest.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
    throw new DOMException('Blocked', 'SecurityError');
  });
  renderOnboarding();
  await submitProfile();
  expect(progress()).toHaveTextContent('Step 2 of 5');
});

it('hydrates server markup before restoring a different saved step', async () => {
  const view = renderOnboarding();
  await submitProfile();
  view.unmount();
  const container = document.createElement('div');
  container.innerHTML = renderToString(<OnboardingPage />);
  expect(container).toHaveTextContent('Step 1 of 5');
  document.body.append(container);
  const onRecoverableError = jest.fn();
  let root!: ReturnType<typeof hydrateRoot>;
  try {
    await act(async () => {
      root = hydrateRoot(container, <OnboardingPage />, { onRecoverableError });
    });
    expect(container).toHaveTextContent('Step 2 of 5');
    expect(onRecoverableError).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
