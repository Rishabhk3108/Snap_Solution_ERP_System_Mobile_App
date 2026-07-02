import client from './client';

export const getProjects = () => client.get('/projects');
