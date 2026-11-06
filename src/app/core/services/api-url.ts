/**
 * Base URL of the Express API. Relative on purpose: in development `ng serve` proxies
 * `/api` to http://localhost:3000 (proxy.conf.json), so the browser never needs the server's
 * address and there are no CORS issues — also when testing from a phone.
 */
export const API_URL = 'https://expense-tracker-be-y6cu.onrender.com/api';
