import { StrictMode } from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { API_BASE_URL } from '@/config';
import { captureDeadline } from '@/test/deadline';
import { server } from '@/test/mocks/server';
import { testProfile } from '@/test/mocks/handlers';
import { OnboardingForm } from './onboarding-form';

const getUrl = `${API_BASE_URL}/corporation-number/:number`;
const postUrl = `${API_BASE_URL}/profile-details`;
const labels = {
  firstName: 'First Name',
  lastName: 'Last Name',
  phone: 'Phone Number',
  corporationNumber: 'Corporation Number',
};
const corporation = () => screen.getByLabelText('Corporation Number');
const submit = () => screen.getByRole('button');
const form = () => screen.getByRole('form');
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
async function fill(
  user: ReturnType<typeof userEvent.setup>,
  values = testProfile,
) {
  for (const key of Object.keys(labels) as (keyof typeof labels)[]) {
    await user.type(screen.getByLabelText(labels[key]), values[key]);
  }
}
function fillWithoutBlur() {
  for (const key of Object.keys(labels) as (keyof typeof labels)[]) {
    fireEvent.change(screen.getByLabelText(labels[key]), {
      target: { value: testProfile[key] },
    });
  }
}
function renderForm() {
  return render(
    <StrictMode>
      <OnboardingForm />
    </StrictMode>,
  );
}

it('starts with four accessible, empty fields and no errors or requests', () => {
  const get = jest.fn(() => HttpResponse.json({ valid: true }));
  server.use(http.get(getUrl, get));
  renderForm();
  expect(
    screen.getByRole('heading', { name: 'Onboarding Form' }),
  ).toBeVisible();
  expect(screen.getAllByRole('textbox')).toHaveLength(4);
  expect(screen.getByRole('alert')).toBeEmptyDOMElement();
  expect(screen.queryByText(/required\./)).not.toBeInTheDocument();
  expect(submit()).toBeEnabled();
  expect(get).not.toHaveBeenCalled();
});
it('validates a name on blur, then accepts a corrected value on blur', async () => {
  renderForm();
  const user = userEvent.setup();
  const first = screen.getByLabelText('First Name');
  await user.click(first);
  await user.tab();
  expect(first).toHaveAccessibleDescription('First name is required.');
  await user.type(first, 'Éva');
  await user.tab();
  expect(first).toHaveAttribute('aria-invalid', 'false');
  expect(screen.queryByText('First name is required.')).not.toBeInTheDocument();
});
it('does not GET while typing or when corporation length is invalid', async () => {
  const get = jest.fn(() => HttpResponse.json({ valid: true }));
  server.use(http.get(getUrl, get));
  renderForm();
  const user = userEvent.setup();
  await user.type(corporation(), '12345678');
  expect(get).not.toHaveBeenCalled();
  await user.tab();
  expect(corporation()).toHaveAccessibleDescription(
    'Corporation number must be exactly 9 characters.',
  );
  expect(get).not.toHaveBeenCalled();
  await user.type(corporation(), '9');
  expect(get).not.toHaveBeenCalled();
  await user.tab();
  await screen.findByText('Corporation number verified.');
  expect(get).toHaveBeenCalledTimes(1);
});
it('shows all missing errors, focuses the first field and does not POST', async () => {
  const post = jest.fn(() => new HttpResponse());
  server.use(http.post(postUrl, post));
  renderForm();
  await userEvent.setup().click(submit());
  expect(screen.getAllByText(/is required\./)).toHaveLength(4);
  expect(screen.getByLabelText('First Name')).toHaveFocus();
  expect(post).not.toHaveBeenCalled();
});
it('validates without any previous blur and submits the normalized four-key payload', async () => {
  let payload: unknown;
  server.use(
    http.post(postUrl, async ({ request }) => {
      payload = await request.json();
      return new HttpResponse(null, { status: 200 });
    }),
  );
  renderForm();
  fillWithoutBlur();
  fireEvent.change(screen.getByLabelText('First Name'), {
    target: { value: ' Hello ' },
  });
  fireEvent.submit(form());
  await screen.findByText('Your details have been submitted successfully.');
  expect(payload).toEqual(testProfile);
  expect(submit()).toBeDisabled();
  expect(screen.getByLabelText('First Name')).toHaveValue(' Hello ');
});
it('shares an in-flight blur GET with submit and waits before POST', async () => {
  const gate = deferred();
  const started = deferred();
  const get = jest.fn(async () => {
    started.resolve();
    await gate.promise;
    return HttpResponse.json({ valid: true });
  });
  const post = jest.fn(() => new HttpResponse(null, { status: 200 }));
  server.use(http.get(getUrl, get), http.post(postUrl, post));
  renderForm();
  const user = userEvent.setup();
  await fill(user);
  await user.tab();
  await started.promise;
  expect(screen.getByText('Checking corporation number…')).toBeVisible();
  await user.click(submit());
  expect(screen.getByRole('button', { name: 'Validating…' })).toBeDisabled();
  expect(corporation()).toBeDisabled();
  expect(post).not.toHaveBeenCalled();
  await act(async () => gate.resolve());
  await screen.findByText('Your details have been submitted successfully.');
  expect(get).toHaveBeenCalledTimes(1);
  expect(post).toHaveBeenCalledTimes(1);
});
it('checks again before submit after a completed blur check', async () => {
  const get = jest.fn(() => HttpResponse.json({ valid: true }));
  server.use(http.get(getUrl, get));
  renderForm();
  const user = userEvent.setup();
  await fill(user);
  await user.tab();
  await screen.findByText('Corporation number verified.');
  await user.click(submit());
  await screen.findByText('Your details have been submitted successfully.');
  expect(get).toHaveBeenCalledTimes(2);
});
it.each([true, false])(
  'ignores a late response for the previous corporation (valid: %s)',
  async (valid) => {
    const gate = deferred();
    const started = deferred();
    const finished = deferred();
    server.use(
      http.get(getUrl, async ({ params }) => {
        if (params.number === testProfile.corporationNumber) {
          started.resolve();
          await gate.promise;
          finished.resolve();
          return HttpResponse.json({ valid, message: 'Old error' });
        }
        return HttpResponse.json({
          valid: false,
          message: 'Current corporation is invalid',
        });
      }),
    );
    renderForm();
    const user = userEvent.setup();
    await user.type(corporation(), testProfile.corporationNumber);
    await user.tab();
    await started.promise;
    await user.clear(corporation());
    await user.type(corporation(), '000000000');
    await user.tab();
    await screen.findByText('Current corporation is invalid');
    await act(async () => {
      gate.resolve();
      await finished.promise;
    });
    expect(corporation()).toHaveAccessibleDescription(
      'Current corporation is invalid',
    );
    expect(screen.queryByText('Old error')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Corporation number verified.'),
    ).not.toBeInTheDocument();
  },
);
it('rejects remote invalidity, focuses corporation and allows correction', async () => {
  const post = jest.fn(() => new HttpResponse());
  server.use(http.post(postUrl, post));
  renderForm();
  const user = userEvent.setup();
  await fill(user, { ...testProfile, corporationNumber: '000000000' });
  await user.click(submit());
  await screen.findByText('Invalid corporation number');
  await waitFor(() => expect(corporation()).toHaveFocus());
  expect(post).not.toHaveBeenCalled();
  expect(corporation()).toBeEnabled();
  await user.clear(corporation());
  expect(
    screen.queryByText('Invalid corporation number'),
  ).not.toBeInTheDocument();
});
it.each(['network', 'http', 'protocol'])(
  'blocks POST after GET %s failure and allows retry',
  async (failure) => {
    const post = jest.fn(() => new HttpResponse());
    server.use(
      http.get(getUrl, () =>
        failure === 'network'
          ? HttpResponse.error()
          : failure === 'http'
            ? new HttpResponse(null, { status: 503 })
            : HttpResponse.json({ valid: 'yes' }),
      ),
      http.post(postUrl, post),
    );
    renderForm();
    fillWithoutBlur();
    fireEvent.submit(form());
    await screen.findByText(
      'We could not verify this corporation number. Please try again.',
    );
    expect(post).not.toHaveBeenCalled();
    expect(corporation()).toBeEnabled();
    server.use(http.get(getUrl, () => HttpResponse.json({ valid: true })));
    await userEvent.setup().click(submit());
    await screen.findByText('Your details have been submitted successfully.');
  },
);
it('blocks concurrent submits during GET and POST, and blocks resubmission after success until editing', async () => {
  const getGate = deferred();
  const postGate = deferred();
  const postStarted = deferred();
  const get = jest.fn(async () => {
    await getGate.promise;
    return HttpResponse.json({ valid: true });
  });
  const post = jest.fn(async () => {
    postStarted.resolve();
    await postGate.promise;
    return new HttpResponse(null, { status: 200 });
  });
  server.use(http.get(getUrl, get), http.post(postUrl, post));
  renderForm();
  fillWithoutBlur();
  fireEvent.submit(form());
  fireEvent.submit(form());
  await act(async () => getGate.resolve());
  await postStarted.promise;
  expect(screen.getByRole('button', { name: 'Submitting…' })).toBeDisabled();
  fireEvent.submit(form());
  fireEvent.submit(form());
  await act(async () => postGate.resolve());
  await screen.findByText('Your details have been submitted successfully.');
  fireEvent.submit(form());
  expect(post).toHaveBeenCalledTimes(1);
  expect(get).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText('First Name'), {
    target: { value: 'Eva' },
  });
  expect(submit()).toBeEnabled();
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
});
it('renders backend 400 message as text and retains all values', async () => {
  server.use(
    http.post(postUrl, () =>
      HttpResponse.json(
        { message: '<script>Invalid phone number</script>' },
        { status: 400 },
      ),
    ),
  );
  renderForm();
  fillWithoutBlur();
  fireEvent.submit(form());
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent(
      '<script>Invalid phone number</script>',
    ),
  );
  for (const key of Object.keys(labels) as (keyof typeof labels)[])
    expect(screen.getByLabelText(labels[key])).toHaveValue(testProfile[key]);
  expect(document.querySelector('script')).toBeNull();
  expect(submit()).toBeEnabled();
});
it('does not automatically retry an uncertain POST', async () => {
  const post = jest.fn(() => HttpResponse.error());
  server.use(http.post(postUrl, post));
  renderForm();
  fillWithoutBlur();
  fireEvent.submit(form());
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent(
      'It may have been received.',
    ),
  );
  expect(post).toHaveBeenCalledTimes(1);
  expect(submit()).toBeEnabled();
});
it('submits with Enter from the last field', async () => {
  renderForm();
  const user = userEvent.setup();
  await fill(user);
  await user.keyboard('{Enter}');
  await screen.findByText('Your details have been submitted successfully.');
});
it('aborts a pending verification when unmounted', async () => {
  const started = deferred();
  const gate = deferred();
  const abort = jest.spyOn(AbortController.prototype, 'abort');
  server.use(
    http.get(getUrl, async () => {
      started.resolve();
      await gate.promise;
      return HttpResponse.json({ valid: true });
    }),
  );
  const view = renderForm();
  fillWithoutBlur();
  fireEvent.blur(corporation());
  await started.promise;
  const before = abort.mock.calls.length;
  view.unmount();
  expect(abort.mock.calls.length).toBeGreaterThan(before);
  await act(async () => gate.resolve());
  abort.mockRestore();
});
it('shows a recoverable GET timeout without POST', async () => {
  const clock = captureDeadline();
  const started = deferred();
  const gate = deferred();
  const post = jest.fn(() => new HttpResponse());
  server.use(
    http.get(getUrl, async () => {
      started.resolve();
      await gate.promise;
      return HttpResponse.json({ valid: true });
    }),
    http.post(postUrl, post),
  );
  renderForm();
  fillWithoutBlur();
  fireEvent.submit(form());
  await started.promise;
  await act(async () => clock.expire());
  await screen.findByText(
    'We could not verify this corporation number. Please try again.',
  );
  expect(post).not.toHaveBeenCalled();
  await act(async () => gate.resolve());
  clock.restore();
});

it('reports an uncertain POST timeout and never retries automatically', async () => {
  const clock = captureDeadline();
  const started = deferred();
  const gate = deferred();
  const post = jest.fn(async () => {
    started.resolve();
    await gate.promise;
    return new HttpResponse(null, { status: 200 });
  });
  server.use(http.post(postUrl, post));
  renderForm();
  fillWithoutBlur();
  await act(async () => {
    fireEvent.submit(form());
    await started.promise;
  });
  await act(async () => clock.expire());
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent(
      'It may have been received.',
    ),
  );
  expect(submit()).toBeEnabled();
  expect(post).toHaveBeenCalledTimes(1);
  await act(async () => gate.resolve());
  clock.restore();
});

it('aborts POST on unmount without submitting twice', async () => {
  const started = deferred();
  const gate = deferred();
  const abort = jest.spyOn(AbortController.prototype, 'abort');
  const post = jest.fn(async () => {
    started.resolve();
    await gate.promise;
    return new HttpResponse(null, { status: 200 });
  });
  server.use(http.post(postUrl, post));
  const view = renderForm();
  fillWithoutBlur();
  await act(async () => {
    fireEvent.submit(form());
    await started.promise;
  });
  const before = abort.mock.calls.length;
  view.unmount();
  expect(abort.mock.calls.length).toBeGreaterThan(before);
  await act(async () => gate.resolve());
  expect(post).toHaveBeenCalledTimes(1);
  abort.mockRestore();
});
