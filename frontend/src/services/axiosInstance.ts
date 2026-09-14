import axios from 'axios';
import { apiConfig } from './apiConfig';

export const axiosAuth = axios.create({
  baseURL: apiConfig.apiBaseAuth,
});

export const axiosApp = axios.create({
  baseURL: apiConfig.apiBaseApp,
});

for (const client of [axiosAuth, axiosApp]) {
  client.interceptors.request.use((config) => {
    if (apiConfig.programId) {
      config.headers.set('x-program-id', apiConfig.programId);
    }

    return config;
  });
}
