import { create } from 'zustand';

export interface QueuedCapture {
  id: string;
  projectId: string;
  mediaType: string;
  mediaBlob: Blob | string;
  gps?: { lat: number; lng: number };
  notes?: string;
  activityId?: string;
  queuedAt: string;
}

export interface CaptureInput {
  projectId: string;
  mediaType: string;
  mediaBlob: Blob | string | null;
  gps?: { lat: number; lng: number };
  notes?: string;
  activityId?: string;
}

export interface CaptureState {
  offlineQueue: QueuedCapture[];
  currentCapture: CaptureInput | null;
  isOffline: boolean;
  pendingCount: number;
  
  setIsOffline: (status: boolean) => void;
  setCurrentCapture: (capture: CaptureInput | null) => void;
  updateCurrentCapture: (data: Partial<CaptureInput>) => void;
  
  addToQueue: (capture: QueuedCapture) => void;
  removeFromQueue: (id: string) => void;
  setQueue: (queue: QueuedCapture[]) => void;
  syncQueue: () => Promise<void>;
}

export const useCaptureStore = create<CaptureState>((set, get) => ({
  offlineQueue: [],
  currentCapture: null,
  isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
  pendingCount: 0,
  
  setIsOffline: (status) => set({ isOffline: status }),
  
  setCurrentCapture: (capture) => set({ currentCapture: capture }),
  
  updateCurrentCapture: (data) => set((state) => ({
    currentCapture: state.currentCapture 
      ? { ...state.currentCapture, ...data } 
      : data as CaptureInput
  })),
  
  addToQueue: (capture) => set((state) => ({
    offlineQueue: [...state.offlineQueue, capture],
    pendingCount: state.pendingCount + 1,
  })),
  
  removeFromQueue: (id) => set((state) => ({
    offlineQueue: state.offlineQueue.filter(c => c.id !== id),
    pendingCount: Math.max(0, state.pendingCount - 1),
  })),
  
  setQueue: (queue) => set({ 
    offlineQueue: queue, 
    pendingCount: queue.length 
  }),
  
  syncQueue: async () => {
    // This will be implemented in lib/offlineQueue.ts and called from there or here
  }
}));
