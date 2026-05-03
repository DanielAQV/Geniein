export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const fetcher = (url: string) => fetch(`${API_BASE_URL}${url}`).then((res) => res.json());
