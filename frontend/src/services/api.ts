import axios from 'axios';

// Default to localhost:3001 if env is missing
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // You can handle global API errors here (e.g. notifications)
    console.error('API Error:', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);
