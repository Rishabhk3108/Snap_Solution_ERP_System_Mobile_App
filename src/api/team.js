import client from './client';

/**
 * Employees grouped by project, with today's attendance status, for the
 * ROLE_MANAGER/ROLE_ADMIN "My Team" proxy check-in/out screen.
 */
export const getMyTeam = () => client.get('/attendance/my-team');
