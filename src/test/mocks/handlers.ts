import { HttpResponse, http } from 'msw/http';
import { API_BASE_URL } from '@/config';

export const testProfile = {
  firstName: 'Hello',
  lastName: 'World',
  phone: '+13062776103',
  corporationNumber: '826417395',
};
export const handlers = [
  http.get(`${API_BASE_URL}/corporation-number/:number`, ({ params }) =>
    HttpResponse.json(
      params.number === testProfile.corporationNumber
        ? { valid: true, corporationNumber: params.number }
        : { valid: false, message: 'Invalid corporation number' },
      { status: params.number === testProfile.corporationNumber ? 200 : 404 },
    ),
  ),
  http.post(
    `${API_BASE_URL}/profile-details`,
    () => new HttpResponse(null, { status: 200 }),
  ),
];
