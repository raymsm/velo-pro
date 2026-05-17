/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RideRecord, VehicleProfile, RiderDetails, UserSettings, PlannedRide } from './types';
import { RideService } from './rideService';
import Dashboard from './components/Dashboard';
import ActiveRide from './components/ActiveRide';
import FuelLog from './components/FuelLog';
import History from './components/History';
import ProfileSettings from './components/ProfileSettings';
import AIChat from './components/AIChat';
import RoutePlanner from './components/RoutePlanner';
import VoiceAssistant from './components/VoiceAssistant';
import { Bike, History as HistoryIcon, LayoutDashboard, Fuel, LogOut, Navigation, Play, MessageSquare, ShieldAlert, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [rides, setRides] = useState<RideRecord[]>([]);
  const [profile, setProfile] = useState<{ vehicle?: VehicleProfile, rider?: RiderDetails, settings?: UserSettings } | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activePlannedRide, setActivePlannedRide] = useState<PlannedRide | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<{ temp: number, wind: number, condition: string } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await fetch(`/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          const data = await res.json();
          if (data.current_weather) {
            setWeather({
              temp: data.current_weather.temperature,
              wind: data.current_weather.windspeed,
              condition: data.current_weather.weathercode > 50 ? 'RAIN_DETECTED' : 'NOMINAL'
            });
          }
        } catch (err) {
          console.error("Weather sync failed");
        }
      });
    }
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u) {
        setRides([]);
        setProfile(null);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubscribeProfile = RideService.subscribeToProfile((p) => {
      setProfile(p);
    });

    const unsubscribeRides = RideService.subscribeToRides((r) => {
      setRides(r);
    });

    return () => {
      unsubscribeProfile();
      unsubscribeRides();
    };
  }, [user]);

  const loadProfile = async () => {
    const data = await RideService.getProfile();
    setProfile(data);
  };

  const loadRides = async () => {
    const fetchedRides = await RideService.getRides();
    setRides(fetchedRides);
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setActivePlannedRide(undefined);
    setActiveTab('dashboard');
  };

  const handleVoiceCommand = (command: string) => {
    console.log("Processing Voice Command:", command);
    
    if (command.includes('start ride') || command.includes('initialize ride')) {
      setActiveTab('ride');
      // Dispatch for ActiveRide to handle internal start if needed
      window.dispatchEvent(new CustomEvent('ride-command', { detail: 'start' }));
    } else if (command.includes('end ride') || command.includes('stop ride') || command.includes('finish ride')) {
      window.dispatchEvent(new CustomEvent('ride-command', { detail: 'stop' }));
    } else if (command.includes('log fuel') || command.includes('fuel entry')) {
      setActiveTab('fuel');
    } else if (command.includes('navigate to') || command.includes('find')) {
      if (activeTab !== 'ride') setActiveTab('ride');
      
      if (command.includes('fuel') || command.includes('gas')) {
        window.dispatchEvent(new CustomEvent('ride-command', { detail: 'nav-fuel' }));
      } else if (command.includes('hotel') || command.includes('stay') || command.includes('sleep')) {
        window.dispatchEvent(new CustomEvent('ride-command', { detail: 'nav-hotel' }));
      } else if (command.includes('service') || command.includes('repair') || command.includes('mechanic')) {
        window.dispatchEvent(new CustomEvent('ride-command', { detail: 'nav-service' }));
      }
    } else if (command.includes('go to data') || command.includes('dashboard')) {
      setActiveTab('dashboard');
    } else if (command.includes('go to intel') || command.includes('settings')) {
      setActiveTab('settings');
    } else if (command.includes('ai') || command.includes('chat')) {
      setActiveTab('ai');
    }
  };

  const handleStartMission = (ride: PlannedRide) => {
    setActivePlannedRide(ride);
    setActiveTab('ride');
  };

  const handleRideEnd = async (rideData: any) => {
    const newRide: Omit<RideRecord, 'userId'> = {
      startTime: rideData.startTime,
      endTime: rideData.endTime,
      distance: rideData.distance,
      path: rideData.path,
      stops: rideData.stops,
      fuelAdded: 0,
      fuelCost: 0,
      parkingLocation: rideData.path[rideData.path.length - 1]
    };
    
    await RideService.saveRide(newRide);
    await RideService.incrementOdometer(newRide.distance);
    // Real-time listeners will handle setProfile and setRides
    setActivePlannedRide(undefined);
    setActiveTab('dashboard');
  };

  const handleFuelLog = async (amount: number, cost: number) => {
    const lastRide = rides.find(r => r.fuelAdded === 0);
    if (lastRide && lastRide.id) {
        await RideService.updateRide(lastRide.id, {
            fuelAdded: amount,
            fuelCost: cost,
            economy: lastRide.distance / amount
        });
    } else {
        const fuelRide: Omit<RideRecord, 'userId'> = {
            startTime: Date.now(),
            endTime: Date.now(),
            distance: 0,
            path: [],
            stops: [],
            fuelAdded: amount,
            fuelCost: cost
        };
        await RideService.saveRide(fuelRide);
    }
    // Real-time listener handled loadRides
    setActiveTab('dashboard');
  };

  if (loading) {
      return (
          <div className="min-h-screen bg-background flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
      );
  }

  if (!user) {
      return (
        <div className="min-h-screen bg-[#0A0B0D] flex items-center justify-center p-6 text-[#E0E0E0]">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
                <Card className="border-[#2A2D33] bg-[#121417] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
                    <CardHeader className="text-center space-y-4 pt-10">
                        <div className="mx-auto w-14 h-14 bg-primary rounded flex items-center justify-center text-black shadow-[0_0_30px_-5px_rgba(200,255,0,0.4)]">
                            <Bike className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                            <CardTitle className="text-3xl font-bold uppercase tracking-tighter">VELO<span className="text-primary">TRAX</span></CardTitle>
                            <CardDescription className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500">Professional Grade Telemetry</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-8 pb-10">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                            <span className="w-1 h-1 bg-primary rounded-full"></span>
                            AUTH_PROTOCOL: GOOGLE_OIDC
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                            <span className="w-1 h-1 bg-primary rounded-full"></span>
                            ENCRYPTION: AES-256-GCM
                          </div>
                        </div>
                        <Button onClick={handleLogin} className="w-full h-14 text-sm font-bold uppercase tracking-[0.2em] bg-primary text-black hover:bg-primary/90 transition-all shadow-lg active:scale-[0.98]">
                            ACCESS_SYSTEM
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#0A0B0D] flex flex-col max-w-md mx-auto border-x border-[#2A2D33] shadow-2xl overflow-hidden relative text-[#E0E0E0] font-sans">
      {/* Top Header / App Bar */}
      <header className="h-14 border-b border-[#2A2D33] flex items-center justify-between px-6 bg-[#121417] z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center shadow-[0_0_15px_-3px_var(--color-primary)]">
            <Bike className="w-5 h-5 text-black" />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-bold tracking-tighter uppercase leading-none">VELO<span className="text-primary">TRAX</span> PRO</h1>
            <span className="px-1.5 py-0.5 rounded border border-[#2A2D33] text-[8px] text-gray-500 font-mono tracking-widest leading-none">v4.2.0</span>
          </div>
        </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[9px] font-mono text-gray-500 uppercase">Weather_Guard</p>
                <div className="flex items-center gap-2">
                    {weather ? (
                        <>
                            <span className={`text-[9px] font-mono uppercase ${weather.condition === 'RAIN_DETECTED' ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
                                {weather.condition}
                            </span>
                            <span className="text-[9px] font-mono uppercase text-gray-400">
                                {weather.temp}°C | {weather.wind}kmh
                            </span>
                        </>
                    ) : (
                        <span className="text-[9px] font-mono uppercase text-gray-600">Syncing...</span>
                    )}
                </div>
              </div>
              <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              <span className="text-[9px] font-mono uppercase text-primary">System_ON</span>
            </div>
          </div>
        </div>
      </header>

      <VoiceAssistant onCommand={handleVoiceCommand} />

      <main className="flex-1 p-4 pb-24 overflow-y-auto">
        <AnimatePresence mode="wait">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsContent value="dashboard" className="m-0">
                    <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <Dashboard 
                          rides={rides} 
                          currency={profile?.settings?.currency} 
                          odometer={profile?.vehicle?.currentOdometer} 
                        />
                    </motion.div>
                </TabsContent>
                <TabsContent value="ride" className="m-0">
                     <motion.div key="ride" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                        <ActiveRide onRideEnd={handleRideEnd} plannedRide={activePlannedRide} />
                    </motion.div>
                </TabsContent>
                <TabsContent value="fuel" className="m-0">
                     <motion.div key="fuel" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <FuelLog onLog={handleFuelLog} />
                    </motion.div>
                </TabsContent>
                <TabsContent value="history" className="m-0">
                     <motion.div key="hist" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <History rides={rides} currency={profile?.settings?.currency} />
                    </motion.div>
                </TabsContent>
                <TabsContent value="plan" className="m-0">
                     <motion.div key="plan" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <RoutePlanner onStartMission={handleStartMission} />
                    </motion.div>
                </TabsContent>
                <TabsContent value="ai" className="m-0">
                     <motion.div key="ai" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                        <AIChat />
                    </motion.div>
                </TabsContent>
                <TabsContent value="settings" className="m-0">
                     <motion.div key="settings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <ProfileSettings onUpdate={loadRides} />
                    </motion.div>
                </TabsContent>
            </Tabs>
        </AnimatePresence>
      </main>

      {/* Dock Navigation */}
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-md h-14 bg-black/90 backdrop-blur-xl border border-[#2A2D33] rounded-xl flex items-center justify-around px-2 z-[1000] shadow-2xl">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard />} label="Data" />
        <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<HistoryIcon />} label="Logs" />
        <NavButton active={activeTab === 'plan'} onClick={() => setActiveTab('plan')} icon={<Calendar />} label="Plan" />
        <div className="w-11 h-11 bg-primary rounded-lg -translate-y-6 flex items-center justify-center text-black shadow-[0_10px_20px_-5px_rgba(200,255,0,0.3)] border-2 border-[#0A0B0D] cursor-pointer hover:scale-105 transition-transform" onClick={() => setActiveTab('ride')}>
            <PlayIcon className="w-6 h-6 fill-current" />
        </div>
        <NavButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} icon={<MessageSquare />} label="AI" />
        <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<ShieldAlert />} label="Intel" />
      </footer>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
    return (
        <button 
            onClick={onClick}
            className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
            {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
            <span className="text-[9px] font-mono uppercase tracking-tighter">{label}</span>
        </button>
    );
}

function PlayIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
    );
}

