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
import { db, auth, isFirebaseSetup } from './firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// Memory listener lists for offline updates
type CleanListener<T> = (data: T) => void;
const ridesListeners = new Set<CleanListener<RideRecord[]>>();
const profileListeners = new Set<CleanListener<any>>();

function notifyRidesListeners(data: RideRecord[]) {
  ridesListeners.forEach(cb => cb(data));
}

function notifyProfileListeners(data: any) {
  profileListeners.forEach(cb => cb(data));
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    }
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
    if (!isFirebaseSetup) {
      const id = 'ride_' + Math.random().toString(36).substr(2, 9);
      const rideData: RideRecord = {
        ...ride,
        id,
        userId: "offline_rider_intel"
      };
      const existing = localStorage.getItem('rideflow_local_rides');
      const rides = existing ? JSON.parse(existing) : [];
      rides.unshift(rideData);
      localStorage.setItem('rideflow_local_rides', JSON.stringify(rides));
      notifyRidesListeners(rides);
      return;
    }

    if (!auth?.currentUser) throw new Error("User must be signed in");
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
    if (!isFirebaseSetup) {
      const existing = localStorage.getItem('rideflow_local_rides');
      return existing ? JSON.parse(existing) : [];
    }

    if (!auth?.currentUser) return [];
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
    if (!isFirebaseSetup) {
      const existing = localStorage.getItem('rideflow_local_rides');
      const rides = existing ? JSON.parse(existing) : [];
      const updated = rides.map((r: RideRecord) => r.id === rideId ? { ...r, ...updates } : r);
      localStorage.setItem('rideflow_local_rides', JSON.stringify(updated));
      notifyRidesListeners(updated);
      return;
    }

    const path = `rides/${rideId}`;
    try {
        await updateDoc(doc(db, 'rides', rideId), updates);
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  getProfile: async (): Promise<{ vehicle?: VehicleProfile, rider?: RiderDetails, settings?: UserSettings } | null> => {
    if (!isFirebaseSetup) {
      const existing = localStorage.getItem('rideflow_local_profile');
      if (!existing) {
        const defaultProfile: { vehicle: VehicleProfile, rider: RiderDetails, settings: UserSettings } = {
          vehicle: { make: "Pro Tourer", model: "Interceptor 650", year: 2024, fuelCapacity: 15, averageEconomy: 25, currentOdometer: 14500 },
          rider: { name: "Aditya Office", bloodGroup: "O+", medication: "None", notes: "Safe commuter", insurance: "National Cycle Co", emergencyContact: { name: "Home Emergency", phone: "+91 99999 88888" } },
          settings: { currency: "INR", theme: "dark" }
        };
        return defaultProfile;
      }
      return JSON.parse(existing);
    }

    if (!auth?.currentUser) return null;
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
    if (!isFirebaseSetup) {
      profileListeners.add(callback);
      RideService.getProfile().then(p => callback(p));
      return () => {
        profileListeners.delete(callback);
      };
    }

    if (!auth?.currentUser) return () => {};
    return onSnapshot(doc(db, 'users', auth.currentUser.uid), (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      }
    });
  },

  subscribeToRides: (callback: (rides: RideRecord[]) => void) => {
    if (!isFirebaseSetup) {
      ridesListeners.add(callback);
      RideService.getRides().then(r => callback(r));
      return () => {
        ridesListeners.delete(callback);
      };
    }

    if (!auth?.currentUser) return () => {};
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
    if (!isFirebaseSetup) {
      const current = await RideService.getProfile() || {};
      const updated = {
        ...current,
        vehicle: data.vehicle ? { ...current.vehicle, ...data.vehicle } : current.vehicle,
        rider: data.rider ? { ...current.rider, ...data.rider } : current.rider,
        settings: data.settings ? { ...current.settings, ...data.settings } : current.settings,
      };
      localStorage.setItem('rideflow_local_profile', JSON.stringify(updated));
      notifyProfileListeners(updated);
      return;
    }

    if (!auth?.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), data as any);
    } catch (error) {
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'users', auth.currentUser.uid), data as any);
    }
  },

  incrementOdometer: async (distance: number) => {
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

  importData: async (importedRides: any[]): Promise<number> => {
    if (!isFirebaseSetup) {
      if (!Array.isArray(importedRides)) throw new Error("Invalid backup format. Must be an array of ride records.");
      
      let importedCount = 0;
      const existing = localStorage.getItem('rideflow_local_rides');
      const rides = existing ? JSON.parse(existing) : [];
      
      for (const r of importedRides) {
        if (typeof r.startTime === 'number' && typeof r.distance === 'number' && Array.isArray(r.path)) {
          const rideToSave: RideRecord = {
            id: 'ride_' + Math.random().toString(36).substr(2, 9),
            userId: "offline_rider_intel",
            startTime: r.startTime,
            endTime: r.endTime || r.startTime,
            distance: r.distance,
            path: r.path,
            stops: Array.isArray(r.stops) ? r.stops : [],
            fuelAdded: typeof r.fuelAdded === 'number' ? r.fuelAdded : 0,
            fuelCost: typeof r.fuelCost === 'number' ? r.fuelCost : 0,
            parkingLocation: Array.isArray(r.parkingLocation) && r.parkingLocation.length === 2 ? r.parkingLocation : undefined,
            economy: typeof r.economy === 'number' ? r.economy : undefined
          };
          rides.unshift(rideToSave);
          importedCount++;
        }
      }
      localStorage.setItem('rideflow_local_rides', JSON.stringify(rides));
      notifyRidesListeners(rides);
      return importedCount;
    }

    if (!auth?.currentUser) throw new Error("User must be signed in to restore data.");
    if (!Array.isArray(importedRides)) throw new Error("Invalid backup format. Must be an array of ride records.");
    
    let importedCount = 0;
    for (const r of importedRides) {
      if (typeof r.startTime === 'number' && typeof r.distance === 'number' && Array.isArray(r.path)) {
        const rideToSave: Omit<RideRecord, 'userId'> = {
          startTime: r.startTime,
          endTime: r.endTime || r.startTime,
          distance: r.distance,
          path: r.path,
          stops: Array.isArray(r.stops) ? r.stops : [],
          fuelAdded: typeof r.fuelAdded === 'number' ? r.fuelAdded : 0,
          fuelCost: typeof r.fuelCost === 'number' ? r.fuelCost : 0,
          parkingLocation: Array.isArray(r.parkingLocation) && r.parkingLocation.length === 2 ? r.parkingLocation : undefined,
          economy: typeof r.economy === 'number' ? r.economy : undefined
        };
        await RideService.saveRide(rideToSave);
        importedCount++;
      }
    }
    return importedCount;
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
    if (!isFirebaseSetup) {
      const id = 'plan_' + Math.random().toString(36).substr(2, 9);
      const plannedData: PlannedRide = {
        ...planned,
        id,
        userId: "offline_rider_intel"
      };
      const existing = localStorage.getItem('rideflow_local_planned');
      const plans = existing ? JSON.parse(existing) : [];
      plans.push(plannedData);
      localStorage.setItem('rideflow_local_planned', JSON.stringify(plans));
      return;
    }

    if (!auth?.currentUser) throw new Error("User must be signed in");
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
    if (!isFirebaseSetup) {
      const existing = localStorage.getItem('rideflow_local_planned');
      const plans = existing ? JSON.parse(existing) : [];
      return plans.sort((a: PlannedRide, b: PlannedRide) => a.departureTime - b.departureTime);
    }

    if (!auth?.currentUser) return [];
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
    if (!isFirebaseSetup) {
      const existing = localStorage.getItem('rideflow_local_planned');
      const plans = existing ? JSON.parse(existing) : [];
      const updated = plans.filter((p: PlannedRide) => p.id !== id);
      localStorage.setItem('rideflow_local_planned', JSON.stringify(updated));
      return;
    }

    const path = `planned_rides/${id}`;
    try {
      await deleteDoc(doc(db, 'planned_rides', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};
