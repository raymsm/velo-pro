/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RideRecord, VehicleProfile, RiderDetails, UserSettings, PlannedRide } from "./types";
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from './firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Haversine formula to calculate distance between two points in km
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateTotalDistance(path: [number, number][]): number {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    total += calculateDistance(path[i][0], path[i][1], path[i+1][0], path[i+1][1]);
  }
  return total;
}

export function calculateEconomy(distance: number, fuel: number): number {
  if (fuel === 0) return 0;
  return distance / fuel;
}

export const RideService = {
  saveRide: async (ride: Omit<RideRecord, 'userId'>) => {
    if (!auth.currentUser) throw new Error("User must be signed in");
    
    const path = 'rides';
    try {
      const rideData = {
        ...ride,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, path), rideData);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  
  getRides: async (): Promise<RideRecord[]> => {
    if (!auth.currentUser) return [];
    
    const path = 'rides';
    try {
      const q = query(
        collection(db, path), 
        where("userId", "==", auth.currentUser.uid),
        orderBy("startTime", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RideRecord));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  updateRide: async (rideId: string, updates: Partial<RideRecord>) => {
      const path = `rides/${rideId}`;
      try {
          await updateDoc(doc(db, 'rides', rideId), updates);
      } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, path);
      }
  },

  getProfile: async (): Promise<{ vehicle?: VehicleProfile, rider?: RiderDetails, settings?: UserSettings } | null> => {
    if (!auth.currentUser) return null;
    try {
      const snapshot = await getDocs(query(collection(db, 'users'), where("__name__", "==", auth.currentUser.uid)));
      if (snapshot.empty) return null;
      return snapshot.docs[0].data() as any;
    } catch (error) {
      console.error(error);
      return null;
    }
  },

  subscribeToProfile: (callback: (profile: any) => void) => {
    if (!auth.currentUser) return () => {};
    return onSnapshot(doc(db, 'users', auth.currentUser.uid), (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      }
    });
  },

  subscribeToRides: (callback: (rides: RideRecord[]) => void) => {
    if (!auth.currentUser) return () => {};
    const q = query(
      collection(db, 'rides'), 
      where("userId", "==", auth.currentUser.uid),
      orderBy("startTime", "desc")
    );
    return onSnapshot(q, (snapshot) => {
      const rides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RideRecord));
      callback(rides);
    });
  },

  updateProfile: async (data: { vehicle?: VehicleProfile, rider?: RiderDetails, settings?: UserSettings }) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), data as any);
    } catch (error) {
      // If doc doesn't exist, set it
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'users', auth.currentUser.uid), data as any);
    }
  },

  incrementOdometer: async (distance: number) => {
    if (!auth.currentUser) return;
    try {
      const profile = await RideService.getProfile();
      if (profile && profile.vehicle) {
        const newOdo = (profile.vehicle.currentOdometer || 0) + distance;
        await RideService.updateProfile({ 
          vehicle: { ...profile.vehicle, currentOdometer: newOdo } 
        });
      }
    } catch (error) {
      console.error("Mileage update failed:", error);
    }
  },
  
  exportData: (rides: RideRecord[]) => {
    const data = JSON.stringify(rides, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rideflow_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  },

  getStats: (rides: RideRecord[]) => {
    const totalDistance = rides.reduce((acc, r) => acc + r.distance, 0);
    const totalFuel = rides.reduce((acc, r) => acc + r.fuelAdded, 0);
    const totalCost = rides.reduce((acc, r) => acc + r.fuelCost, 0);
    const avgEconomy = totalFuel > 0 ? totalDistance / totalFuel : 0;
    
    return {
      totalDistance,
      totalFuel,
      totalCost,
      avgEconomy
    };
  },

  savePlannedRide: async (planned: Omit<PlannedRide, 'userId'>) => {
    if (!auth.currentUser) throw new Error("User must be signed in");
    const path = 'planned_rides';
    try {
      const data = {
        ...planned,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, path), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  getPlannedRides: async (): Promise<PlannedRide[]> => {
    if (!auth.currentUser) return [];
    const path = 'planned_rides';
    try {
      const q = query(
        collection(db, path), 
        where("userId", "==", auth.currentUser.uid),
        orderBy("departureTime", "asc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlannedRide));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  deletePlannedRide: async (id: string) => {
    const path = `planned_rides/${id}`;
    try {
      await deleteDoc(doc(db, 'planned_rides', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};
