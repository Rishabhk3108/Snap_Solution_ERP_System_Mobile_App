import client from './client';

export const getAttendanceStatus = (empid, date) =>
  client.post('/attendance/getAttendanceStatus', { empid, date });

export const checkIn = (payload) =>
  client.post('/attendance/add', payload);

/**
 * Submit a check-in with a face selfie.
 * The server starts face verification in the background and returns immediately
 * with { jobId, status: "processing" }.
 * Poll getCheckinStatus(jobId) every few seconds until status is "success" or "error".
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
    timeout: 30000,  // 30s for the upload itself; face recognition runs after
  });
};

/** Poll for face-verification result after checkInWithFace. */
export const getCheckinStatus = (jobId) =>
  client.get(`/attendance/checkin/status/${jobId}`, { timeout: 10000 });

export const checkOut = (payload) =>
  client.put('/attendance/update', payload);

export const getAttendanceList = (empid, year, month) =>
  client.get(`/attendance/list/${empid}/${year}/${month}`);

export const getDaysWorked = (empid, year, month) =>
  client.get(`/attendance/days-worked/${empid}/${year}/${month}`);
