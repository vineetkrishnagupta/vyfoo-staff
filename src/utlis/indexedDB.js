import { set, get, clear } from 'idb-keyval';

export const saveAppDataToDB = async (data) => {
  await set('KrOfflineDB', data);
  // Dispatch custom event to notify components that data has been updated
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('indexedDBUpdated', { detail: data }));
  }
};

export const getAppDataFromDB = async () => {
  return await get('KrOfflineDB');
};

export const clearAppDataFromDB = async () => {
  await clear();
}; 