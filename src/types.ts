/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Currency = 'INR' | 'GBP' | 'EUR' | 'USD' | 'CUSTOM';

export interface UserSettings {
  currency: Currency;
  customCurrencySymbol?: string;
  theme: 'dark' | 'light' | 'system';
  aiProvider: 'gemini' | 'openai' | 'anthropic' | 'custom';
  aiApiKey?: string;
}

export interface RiderDetails {
  name: string;
  bloodGroup: string;
  medication: string;
  notes: string;
  insurance: string;
  emergencyContact: {
    name: string;
    phone: string;
  };
}

export interface RideRecord {
  id?: string;
  userId: string;
  startTime: number;
  endTime?: number;
  distance: number; // in km
  path: [number, number][]; // Lat/Lng coordinates
  stops: [number, number][]; // Locations where the rider stopped
  fuelAdded: number; // in liters
  fuelCost: number; // in local currency
  parkingLocation?: [number, number];
  economy?: number; // Calculated efficiency
  createdAt?: any;
}

export interface PlannedRide {
  id?: string;
  userId: string;
  title: string;
  startPoint: string;
  destination: string;
  waypoints: string[];
  departureTime: number;
  notes?: string;
  createdAt?: any;
}

export interface VehicleProfile {
  make: string;
  model: string;
  year: number;
  fuelCapacity: number;
  averageEconomy: number; // km per liter
  currentOdometer: number; // in km
}
