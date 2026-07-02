import client from './client';

export const login = (username, password) =>
  client.post('/login', { username, password });
