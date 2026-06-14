import { create } from 'zustand';

export interface OrbitalObject {
  noradId: number;
  name: string;
  objectId: string;
  classification: 0 | 1 | 2 | 3; // 0=debris, 1=active, 2=rocket body, 3=starlink
  satrec: unknown;
  epoch: Date;
  inclination: number;
  eccentricity: number;
  meanMotion: number;
}

export interface DataState {
  objects: OrbitalObject[];
  idToIndex: Map<number, number>;
  totalCount: number;
  loadingProgress: number; // 0–1
  loadingMessage: string;
  isLoaded: boolean;
  loadError: string | null;
  selectedId: number | null;
  hoveredId: number | null;

  filterActive: boolean;
  filterDebris: boolean;
  filterRockets: boolean;
  filterStarlink: boolean;
  altMin: number;
  altMax: number;

  setObjects: (objects: OrbitalObject[]) => void;
  setLoadingProgress: (p: number, msg: string) => void;
  setLoaded: () => void;
  setError: (e: string) => void;
  setSelected: (id: number | null) => void;
  setHovered: (id: number | null) => void;
  toggleFilter: (key: FilterKey) => void;
  setAltRange: (min: number, max: number) => void;
}

type FilterKey = 'filterActive' | 'filterDebris' | 'filterRockets' | 'filterStarlink';

export const useDataStore = create<DataState>((set) => ({
  objects: [],
  idToIndex: new Map(),
  totalCount: 0,
  loadingProgress: 0,
  loadingMessage: 'Initializing orbital catalog...',
  isLoaded: false,
  loadError: null,
  selectedId: null,
  hoveredId: null,

  filterActive: true,
  filterDebris: true,
  filterRockets: true,
  filterStarlink: true,
  altMin: 0,
  altMax: 42000,

  setObjects: (objects) => {
    const idToIndex = new Map<number, number>();
    objects.forEach((o, i) => idToIndex.set(o.noradId, i));
    set({ objects, idToIndex, totalCount: objects.length });
  },
  setLoadingProgress: (loadingProgress, loadingMessage) => set({ loadingProgress, loadingMessage }),
  setLoaded: () => set({ isLoaded: true }),
  setError: (loadError) => set({ loadError }),
  setSelected: (selectedId) => set({ selectedId }),
  setHovered: (hoveredId) => set({ hoveredId }),
  toggleFilter: (key) => set((s) => ({ [key]: !s[key] } as Partial<DataState>)),
  setAltRange: (altMin, altMax) => set({ altMin, altMax }),
}));
