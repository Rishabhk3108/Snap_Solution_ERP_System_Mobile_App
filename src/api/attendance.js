import client from './client';

export const getAttendanceStatus = (empid, date) =>
  client.post('/attendance/getAttendanceStatus', { empid, date });

export const checkIn = (payload) =>
  client.post('/attendance/add', payload);

/**
 * Check-in with face verification.
 * Sends a multipart/form-data request including the selfie photo.
 * If the employee has a registered face and the selfie doesn't match,
 * the server returns 401.  If no face is registered, the server allows check-in.
 */
export const checkInWithFace = (payload, photoUri) => {
  const form = new FormData();
  form.append('empid', String(payload.empid));
  form.append('projectId', String(payload.projectId));
  form.append('date', payload.date);
  form.append('startTime', payload.startTime);
  form.append('location', payload.location);
  form.append('year', String(payload.year));
  form.append('month', String(payload.month));
  if (photoUri) {
    form.append('faceImage', {
      uri: photoUri,
      type: 'image/jpeg',
      name: 'selfie.jpg',
    });
  }
  return client.post('/attendance/checkin', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const checkOut = (payload) =>
  client.put('/attendance/update', payload);

export const getAttendanceList = (empid, year, month) =>
  client.get(`/attendance/list/${empid}/${year}/${month}`);

export const getDaysWorked = (empid, year, month) =>
  client.get(`/attendance/days-worked/${empid}/${year}/${month}`);
