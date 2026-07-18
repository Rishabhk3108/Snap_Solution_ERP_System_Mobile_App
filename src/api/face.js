import client from './client';

/**
 * Send a selfie to the server and compare it against the employee's registered face.
 * Returns { match: bool, score: float, message: string }
 */
export const compareFace = (empid, photoUri) => {
  const form = new FormData();
  form.append('empid', String(empid));
  form.append('faceImage', {
    uri: photoUri,
    type: 'image/jpeg',
    name: 'selfie.jpg',
  });
  return client.post('/face/compare', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 15000,
  });
};
