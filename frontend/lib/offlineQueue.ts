import { QueuedCapture, useCaptureStore } from '@/store/captureStore';
import apiClient from './apiClient';
import { API_ENDPOINTS } from './api/endpoints';

const DB_NAME = 'FieldPulseOfflineDB';
const STORE_NAME = 'captureQueue';

// Open IndexedDB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (e: any) => resolve(e.target.result);
    request.onerror = (e) => reject(e);
  });
};

export const offlineService = {
  // Save capture to IndexedDB
  async saveToQueue(capture: QueuedCapture) {
    try {
      const db = await openDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.add(capture);
        req.onsuccess = () => resolve();
        req.onerror = () => reject();
      });
    } catch (error) {
      console.error('Failed to save to offline queue', error);
    }
  },

  // Load all queued captures
  async loadQueue(): Promise<QueuedCapture[]> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = (e: any) => resolve(e.target.result || []);
        req.onerror = () => reject();
      });
    } catch (error) {
      console.error('Failed to load offline queue', error);
      return [];
    }
  },

  // Remove capture from queue
  async removeFromQueue(id: string) {
    try {
      const db = await openDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject();
      });
    } catch (error) {
      console.error('Failed to remove from offline queue', error);
    }
  },

  // Process queue when online
  async syncQueue() {
    const queue = await this.loadQueue();
    if (queue.length === 0) return;

    for (const capture of queue) {
      try {
        const formData = new FormData();
        formData.append('file', capture.mediaBlob, `capture_${Date.now()}.jpg`);
        formData.append('mediaType', capture.mediaType);
        formData.append('projectId', capture.projectId);
        
        if (capture.gps) {
          formData.append('lat', capture.gps.lat.toString());
          formData.append('lng', capture.gps.lng.toString());
        }
        
        if (capture.notes) {
          formData.append('notes', capture.notes);
        }

        await apiClient.post(API_ENDPOINTS.captures.submit, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        await this.removeFromQueue(capture.id);
        
        // Update store
        useCaptureStore.getState().removeFromQueue(capture.id);
        
      } catch (error) {
        console.error(`Failed to sync capture ${capture.id}`, error);
        // Will retry later
      }
    }
  },
  
  // Set up listeners for online/offline events
  init() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        useCaptureStore.getState().setIsOffline(false);
        this.syncQueue();
      });
      
      window.addEventListener('offline', () => {
        useCaptureStore.getState().setIsOffline(true);
      });
      
      // Initial load
      this.loadQueue().then(queue => {
        useCaptureStore.getState().setQueue(queue);
      });
    }
  }
};
