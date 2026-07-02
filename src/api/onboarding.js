import client from './client';

export const updatePersonalInfo = (userId, data) =>
  client.put(`/personalInformations/${userId}`, data);

export const registerFace = (empid, photoUri) => {
  const form = new FormData();
  form.append('empid', String(empid));
  form.append('faceImage', { uri: photoUri, type: 'image/jpeg', name: 'enroll.jpg' });
  return client.post('/face/register', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const verifyFaceTest = (empid, photoUri) => {
  const form = new FormData();
  form.append('empid', String(empid));
  form.append('faceImage', { uri: photoUri, type: 'image/jpeg', name: 'test.jpg' });
  return client.post('/face/verify-test', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const markOnboardingComplete = () =>
  client.post('/onboarding/complete');
