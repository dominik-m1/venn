import { HttpResponse, http } from 'msw/http';
import { API_BASE_URL } from '@/config';
import { captureDeadline } from '@/test/deadline';
import { testProfile } from '@/test/mocks/handlers';
import { server } from '@/test/mocks/server';
import { ApiErrorKind } from './api-error';
import { checkCorporationNumber, submitProfileDetails } from './onboarding.api';

const signal = () => new AbortController().signal;
const getUrl = `${API_BASE_URL}/corporation-number/:number`;
const postUrl = `${API_BASE_URL}/profile-details`;

it('GET encodes the entire path parameter and checks the returned number', async () => {
  let url = '';
  server.use(
    http.get(getUrl, ({ request }) => {
      url = request.url;
      return HttpResponse.json({ valid: true, corporationNumber: 'a/b ?#%xy' });
    }),
  );
  await expect(checkCorporationNumber('a/b ?#%xy', signal())).resolves.toEqual({
    valid: true,
  });
  expect(url).toBe(`${API_BASE_URL}/corporation-number/a%2Fb%20%3F%23%25xy`);
});
it.each([200, 404])(
  'accepts valid:false with a message on HTTP %s',
  async (status) => {
    server.use(
      http.get(getUrl, () =>
        HttpResponse.json(
          { valid: false, message: 'Unknown corporation' },
          { status },
        ),
      ),
    );
    await expect(
      checkCorporationNumber('000000000', signal()),
    ).resolves.toEqual({ valid: false, message: 'Unknown corporation' });
  },
);
it.each([
  { valid: 'true' },
  { valid: false },
  { valid: false, message: 42 },
  { valid: false, message: '' },
  { valid: false, message: ' \t\r\n\u00a0' },
  { valid: false, message: null },
  {
    valid: false,
    message: 'Unknown corporation',
    corporationNumber: 'different',
  },
  { valid: true, corporationNumber: 'different' },
  { valid: true, corporationNumber: 826417395 },
  { valid: true, corporationNumber: null },
  null,
  [],
  'invalid',
])('rejects malformed GET body %j', async (body) => {
  server.use(http.get(getUrl, () => HttpResponse.json(body)));
  await expect(
    checkCorporationNumber(testProfile.corporationNumber, signal()),
  ).rejects.toMatchObject({ kind: ApiErrorKind.Protocol });
});
it('rejects invalid JSON and a success disguised as 404', async () => {
  server.use(http.get(getUrl, () => new HttpResponse('invalid JSON')));
  await expect(
    checkCorporationNumber(testProfile.corporationNumber, signal()),
  ).rejects.toMatchObject({ kind: ApiErrorKind.Protocol });
  server.use(
    http.get(getUrl, () => HttpResponse.json({ valid: true }, { status: 404 })),
  );
  await expect(
    checkCorporationNumber(testProfile.corporationNumber, signal()),
  ).rejects.toMatchObject({ kind: ApiErrorKind.Protocol });
});
it('sends the exact JSON and Content-Type; accepts an empty 200', async () => {
  let body: unknown;
  let contentType: string | null = null;
  server.use(
    http.post(postUrl, async ({ request }) => {
      body = await request.json();
      contentType = request.headers.get('Content-Type');
      return new HttpResponse(null, { status: 200 });
    }),
  );
  await expect(
    submitProfileDetails(testProfile, signal()),
  ).resolves.toBeUndefined();
  expect(body).toEqual(testProfile);
  expect(contentType).toBe('application/json');
});
it.each([
  [{ message: 'Invalid phone number' }, 'Invalid phone number'],
  [{ message: '  Invalid phone number  ' }, '  Invalid phone number  '],
  [{}, expect.stringContaining('rejected')],
  [{ message: '' }, expect.stringContaining('rejected')],
  [{ message: ' \t\r\n\u00a0' }, expect.stringContaining('rejected')],
  [{ message: 42 }, expect.stringContaining('rejected')],
  [null, expect.stringContaining('rejected')],
  [[], expect.stringContaining('rejected')],
])('handles POST 400: %j', async (body, message) => {
  server.use(
    http.post(postUrl, () => HttpResponse.json(body, { status: 400 })),
  );
  await expect(
    submitProfileDetails(testProfile, signal()),
  ).rejects.toMatchObject({
    kind: ApiErrorKind.Validation,
    status: 400,
    message,
  });
});
it('uses fallback for a non-JSON 400 and rejects an unexpected 201', async () => {
  server.use(
    http.post(postUrl, () => new HttpResponse('oops', { status: 400 })),
  );
  await expect(
    submitProfileDetails(testProfile, signal()),
  ).rejects.toMatchObject({ kind: ApiErrorKind.Validation });
  server.use(http.post(postUrl, () => new HttpResponse(null, { status: 201 })));
  await expect(
    submitProfileDetails(testProfile, signal()),
  ).rejects.toMatchObject({ kind: ApiErrorKind.Http });
});
it('distinguishes server errors and network failures', async () => {
  server.use(http.get(getUrl, () => new HttpResponse(null, { status: 503 })));
  await expect(
    checkCorporationNumber(testProfile.corporationNumber, signal()),
  ).rejects.toMatchObject({ kind: ApiErrorKind.Http, status: 503 });
  server.use(http.get(getUrl, () => HttpResponse.error()));
  await expect(
    checkCorporationNumber(testProfile.corporationNumber, signal()),
  ).rejects.toMatchObject({ kind: ApiErrorKind.Network });
});
it('classifies cancellation', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    checkCorporationNumber(testProfile.corporationNumber, controller.signal),
  ).rejects.toMatchObject({ kind: ApiErrorKind.Aborted });
});
it('times out requests and cleans up its timer', async () => {
  const clock = captureDeadline();
  const clear = jest.spyOn(globalThis, 'clearTimeout');
  server.use(http.get(getUrl, () => new Promise(() => {})));
  const result = expect(
    checkCorporationNumber(testProfile.corporationNumber, signal()),
  ).rejects.toMatchObject({ kind: ApiErrorKind.Timeout });
  clock.expire();
  await result;
  expect(clear).toHaveBeenCalled();
  clock.restore();
});
