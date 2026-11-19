export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'https://fe-hometask-api.qa.vault.tryvault.com'
).replace(/\/$/, '');

export const REQUEST_TIMEOUT_MS = 10_000;
