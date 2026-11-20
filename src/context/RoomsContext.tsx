import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getMyRooms, type Room } from '../services/roomsApi';
import { resolveAuthToken } from '../utils/roomHelpers';
import { useAuth } from './AuthContext';

export interface RefreshRoomsOptions {
  showSkeletonIfEmpty?: boolean;
}

interface RoomsContextValue {
  rooms: Room[];
  hasLoaded: boolean;
  loadingInitial: boolean;
  loadError: string | null;
  refreshRooms: (options?: RefreshRoomsOptions) => Promise<void>;
  addRoom: (room: Room) => void;
  updateRoom: (updated: Room) => void;
  removeRoom: (deletedId: string) => void;
}

interface RoomsCacheState {
  ownerUid: string | null;
  rooms: Room[];
  hasLoaded: boolean;
  loadingInitial: boolean;
  loadError: string | null;
}

const defaultRoomsContext: RoomsContextValue = {
  rooms: [],
  hasLoaded: false,
  loadingInitial: false,
  loadError: null,
  refreshRooms: async () => {},
  addRoom: () => {},
  updateRoom: () => {},
  removeRoom: () => {},
};

const RoomsContext = createContext<RoomsContextValue>(defaultRoomsContext);

/** Caché en memoria (stale-while-revalidate) de las salas del estudiante autenticado. */
export function RoomsProvider({ children }: { children: ReactNode }) {
  const { user, idToken } = useAuth();
  const userUid = user?.uid ?? null;

  const [state, setState] = useState<RoomsCacheState>(() => ({
    ownerUid: userUid,
    rooms: [],
    hasLoaded: false,
    loadingInitial: false,
    loadError: null,
  }));

  const currentUidRef = useRef<string | null>(userUid);
  const hasLoadedRef = useRef(false);
  const requestSeqRef = useRef(0);
  const mutationSeqRef = useRef(0);
  const inFlightRef = useRef<{
    uid: string | null;
    reqSeq: number;
    promise: Promise<void>;
  } | null>(null);
  const prevUidRef = useRef<string | null>(userUid);

  useLayoutEffect(() => {
    currentUidRef.current = userUid;
    hasLoadedRef.current = state.ownerUid === userUid ? state.hasLoaded : false;
  }, [userUid, state.ownerUid, state.hasLoaded]);

  useEffect(() => {
    if (prevUidRef.current === userUid) {
      return;
    }
    prevUidRef.current = userUid;

    if (inFlightRef.current?.uid !== userUid) {
      requestSeqRef.current += 1;
      inFlightRef.current = null;
      hasLoadedRef.current = false;
    }

    setState((prev) =>
      prev.ownerUid === userUid
        ? prev
        : {
            ownerUid: userUid,
            rooms: [],
            hasLoaded: false,
            loadingInitial: false,
            loadError: null,
          }
    );
  }, [userUid]);

  const refreshRooms = useCallback(
    async (options?: RefreshRoomsOptions): Promise<void> => {
      const requestUid = userUid;

      if (inFlightRef.current && inFlightRef.current.uid === requestUid) {
        return inFlightRef.current.promise;
      }

      const isInitial = !hasLoadedRef.current;
      const showSkeleton = isInitial && options?.showSkeletonIfEmpty !== false;

      if (isInitial) {
        setState((prev) => {
          const sameOwner = prev.ownerUid === requestUid;
          return {
            ownerUid: requestUid,
            rooms: sameOwner ? prev.rooms : [],
            hasLoaded: false,
            loadingInitial: showSkeleton,
            loadError: null,
          };
        });
      }

      const reqSeq = ++requestSeqRef.current;
      const mutationSeqAtStart = mutationSeqRef.current;

      const promise = (async () => {
        try {
          const token = await resolveAuthToken(idToken);
          const list = await getMyRooms(token);

          if (
            currentUidRef.current !== requestUid ||
            reqSeq !== requestSeqRef.current
          ) {
            return;
          }

          hasLoadedRef.current = true;
          const keepLocalRooms = mutationSeqAtStart !== mutationSeqRef.current;
          setState((prev) => ({
            ownerUid: requestUid,
            rooms:
              keepLocalRooms && prev.ownerUid === requestUid ? prev.rooms : list,
            hasLoaded: true,
            loadingInitial: false,
            loadError: null,
          }));
        } catch {
          if (
            currentUidRef.current !== requestUid ||
            reqSeq !== requestSeqRef.current
          ) {
            return;
          }

          if (!hasLoadedRef.current) {
            setState((prev) => ({
              ownerUid: requestUid,
              rooms: prev.ownerUid === requestUid ? prev.rooms : [],
              hasLoaded: false,
              loadingInitial: false,
              loadError: 'No pudimos cargar tus salas.',
            }));
          }
        } finally {
          if (
            inFlightRef.current &&
            inFlightRef.current.uid === requestUid &&
            inFlightRef.current.reqSeq === reqSeq
          ) {
            inFlightRef.current = null;
          }
        }
      })();

      inFlightRef.current = {
        uid: requestUid,
        reqSeq,
        promise,
      };

      return promise;
    },
    [userUid, idToken]
  );

  const addRoom = useCallback(
    (room: Room) => {
      mutationSeqRef.current += 1;
      setState((prev) => {
        if (prev.ownerUid !== userUid) {
          return {
            ownerUid: userUid,
            rooms: [room],
            hasLoaded: false,
            loadingInitial: false,
            loadError: null,
          };
        }
        if (prev.rooms.some((item) => item.id === room.id)) {
          return prev;
        }
        return {
          ...prev,
          rooms: [room, ...prev.rooms],
        };
      });
    },
    [userUid]
  );

  const updateRoom = useCallback(
    (updated: Room) => {
      mutationSeqRef.current += 1;
      setState((prev) => {
        if (prev.ownerUid !== userUid) {
          return prev;
        }
        return {
          ...prev,
          rooms: prev.rooms.map((item) =>
            item.id === updated.id ? updated : item
          ),
        };
      });
    },
    [userUid]
  );

  const removeRoom = useCallback(
    (deletedId: string) => {
      mutationSeqRef.current += 1;
      setState((prev) => {
        if (prev.ownerUid !== userUid) {
          return prev;
        }
        return {
          ...prev,
          rooms: prev.rooms.filter((item) => item.id !== deletedId),
        };
      });
    },
    [userUid]
  );

  const isSameOwner = state.ownerUid === userUid;
  const value = useMemo<RoomsContextValue>(
    () => ({
      rooms: isSameOwner ? state.rooms : [],
      hasLoaded: isSameOwner ? state.hasLoaded : false,
      loadingInitial: isSameOwner ? state.loadingInitial : false,
      loadError: isSameOwner ? state.loadError : null,
      refreshRooms,
      addRoom,
      updateRoom,
      removeRoom,
    }),
    [
      isSameOwner,
      state.rooms,
      state.hasLoaded,
      state.loadingInitial,
      state.loadError,
      refreshRooms,
      addRoom,
      updateRoom,
      removeRoom,
    ]
  );

  return <RoomsContext.Provider value={value}>{children}</RoomsContext.Provider>;
}

/** Accede a la caché en memoria de las salas del estudiante autenticado. */
export function useRooms(): RoomsContextValue {
  return useContext(RoomsContext);
}
