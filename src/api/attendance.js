import client from './client';

export const getAttendanceStatus = (empid, date) =>
  client.post('/attendance/getAttendanceStatus', { empid, date });

export const checkIn = (payload) =>
  client.post('/attendance/add', payload);


export const checkOut = (payload) =>
  client.put('/attendance/update', payload);

export const getAttendanceList = (empid, year, month) =>
  client.get(`/attendance/list/${empid}/${year}/${month}`);

export const getDaysWorked = (empid, year, month) =>
  client.get(`/attendance/days-worked/${empid}/${year}/${month}`);
