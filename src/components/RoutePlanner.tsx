import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Navigation, Plus, Trash2, Calendar, Clock, Save, ChevronRight, Play, Search, Loader2 } from 'lucide-react';
import { RideService } from '../rideService';
import { PlannedRide } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface RoutePlannerProps {
  onStartMission: (ride: PlannedRide) => void;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

const LocationSearchInput = ({ 
    label, 
    value, 
    onChange, 
    placeholder, 
    icon: Icon 
}: { 
    label: string, 
    value: string, 
    onChange: (val: string) => void, 
    placeholder: string, 
    icon: any 
}) => {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);

    useEffect(() => {
        setQuery(value);
    }, [value]);

    const handleSearch = async (val: string) => {
        setQuery(val);
        onChange(val);
        if (val.length < 3) {
            setResults([]);
            return;
        }

        setSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5`);
            const data = await res.json();
            setResults(data);
            setShowResults(true);
        } catch (err) {
            console.error(err);
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className="space-y-1 relative">
            <Label className="text-[9px] uppercase text-gray-500 font-mono">{label}</Label>
            <div className="relative">
                <Icon className="absolute left-2 top-2.5 w-3.5 h-3.5 text-gray-500" />
                <Input 
                    value={query} 
                    onChange={e => handleSearch(e.target.value)}
                    placeholder={placeholder}
                    className="h-9 pl-8 pr-8 text-xs font-mono bg-black/40 border-[#2A2D33] focus:border-primary/50"
                    onBlur={() => setTimeout(() => setShowResults(false), 200)}
                    onFocus={() => query.length >= 3 && setShowResults(true)}
                />
                {searching && <Loader2 className="absolute right-2 top-2.5 w-3.5 h-3.5 text-primary animate-spin" />}
            </div>
            
            <AnimatePresence>
                {showResults && results.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute left-0 right-0 top-full mt-1 bg-[#1A1D21] border border-[#2A2D33] rounded-sm z-[100] shadow-2xl max-h-40 overflow-y-auto"
                    >
                        {results.map((r, i) => (
                            <button
                                key={i}
                                className="w-full px-3 py-2 text-left text-[10px] font-mono text-gray-300 hover:bg-black/40 hover:text-primary transition-colors border-b border-[#2A2D33]/30 last:border-0"
                                onClick={() => {
                                    onChange(r.display_name);
                                    setQuery(r.display_name);
                                    setShowResults(false);
                                }}
                            >
                                {r.display_name}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default function RoutePlanner({ onStartMission }: RoutePlannerProps) {
  const [plannedRides, setPlannedRides] = useState<PlannedRide[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);
  const [newRide, setNewRide] = useState<Omit<PlannedRide, 'userId' | 'id'>>({
    title: '',
    startPoint: '',
    destination: '',
    waypoints: [],
    departureTime: Date.now(),
    notes: ''
  });

  const loadPlannedRides = async () => {
    const rides = await RideService.getPlannedRides();
    setPlannedRides(rides);
  };

  useEffect(() => {
    loadPlannedRides();
  }, []);

  const addWaypoint = () => {
    setNewRide({ ...newRide, waypoints: [...newRide.waypoints, ''] });
  };

  const updateWaypoint = (index: number, value: string) => {
    const updated = [...newRide.waypoints];
    updated[index] = value;
    setNewRide({ ...newRide, waypoints: updated });
  };

  const removeWaypoint = (index: number) => {
    setNewRide({ ...newRide, waypoints: newRide.waypoints.filter((_, i) => i !== index) });
  };

  const handleSave = async () => {
    if (!newRide.title || !newRide.startPoint || !newRide.destination) return;
    await RideService.savePlannedRide(newRide);
    setIsPlanning(false);
    setNewRide({
      title: '',
      startPoint: '',
      destination: '',
      waypoints: [],
      departureTime: Date.now(),
      notes: ''
    });
    loadPlannedRides();
  };

  const handleDelete = async (id: string) => {
    await RideService.deletePlannedRide(id);
    loadPlannedRides();
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Mission_Briefings</h2>
          <p className="text-[10px] text-gray-500 uppercase font-mono tracking-widest">Future_Ops_Planning</p>
        </div>
        <Button 
            onClick={() => setIsPlanning(!isPlanning)} 
            className={`rounded-sm uppercase font-mono text-[10px] tracking-widest h-8 ${isPlanning ? 'bg-red-500 text-white' : 'bg-primary text-black'}`}
        >
            {isPlanning ? 'Cancel_Op' : 'New_Mission'}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {isPlanning ? (
          <motion.div
            key="planner"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="bg-[#121417] border-[#2A2D33] rounded-sm overflow-hidden">
              <CardHeader className="p-4 border-b border-[#2A2D33]/30 bg-black/20">
                <CardTitle className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                  <Navigation className="w-3 h-3" /> Mission_Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase text-gray-500 font-mono">Mission_Name</Label>
                  <Input 
                    value={newRide.title} 
                    onChange={e => setNewRide({ ...newRide, title: e.target.value })}
                    placeholder="e.g. Coastal Raid"
                    className="h-9 text-xs font-mono bg-black/40 border-[#2A2D33] focus:border-primary/50"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LocationSearchInput 
                    label="Insertion_Point" 
                    value={newRide.startPoint} 
                    onChange={val => setNewRide({ ...newRide, startPoint: val })}
                    placeholder="Search start location..."
                    icon={MapPin}
                  />
                  <LocationSearchInput 
                    label="Extraction_Point" 
                    value={newRide.destination} 
                    onChange={val => setNewRide({ ...newRide, destination: val })}
                    placeholder="Search destination..."
                    icon={Navigation}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[9px] uppercase text-gray-500 font-mono">Waypoints</Label>
                    <Button variant="outline" size="sm" onClick={addWaypoint} className="h-6 px-2 text-[8px] font-mono border-dashed border-[#2A2D33] text-gray-500 hover:text-primary">
                        <Plus className="w-2.5 h-2.5 mr-1" /> Add_Point
                    </Button>
                  </div>
                  {newRide.waypoints.map((wp, i) => (
                    <div key={i} className="flex gap-2 items-end">
                        <div className="flex-1">
                             <LocationSearchInput 
                                label={`WP_${i+1}`} 
                                value={wp} 
                                onChange={val => updateWaypoint(i, val)}
                                placeholder="Search waypoint..."
                                icon={MapPin}
                             />
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeWaypoint(i)} className="h-9 w-9 p-0 text-gray-600 hover:text-red-500 mb-0.5">
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[9px] uppercase text-gray-500 font-mono">Deployment_Date</Label>
                    <Input 
                        type="datetime-local" 
                        value={new Date(newRide.departureTime).toISOString().slice(0, 16)} 
                        onChange={e => setNewRide({ ...newRide, departureTime: new Date(e.target.value).getTime() })}
                        className="h-9 text-xs font-mono bg-black/40 border-[#2A2D33]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] uppercase text-gray-500 font-mono">Notes</Label>
                    <Input 
                        value={newRide.notes} 
                        onChange={e => setNewRide({ ...newRide, notes: e.target.value })}
                        placeholder="Gear check, tires..."
                        className="h-9 text-xs font-mono bg-black/40 border-[#2A2D33]"
                    />
                  </div>
                </div>

                <Button onClick={handleSave} className="w-full bg-primary text-black font-bold uppercase tracking-[0.2em] h-11 mt-2">
                    Confirm_Mission
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <ScrollArea key="list" className="h-[calc(100vh-280px)]">
            <div className="space-y-3">
              {plannedRides.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-[#2A2D33] rounded-sm bg-black/20">
                    <Calendar className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                    <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">No_Future_Operations_Scheduled</p>
                </div>
              ) : (
                plannedRides.map(ride => (
                  <Card key={ride.id} className="bg-[#121417] border-[#2A2D33] rounded-sm group overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/30 group-hover:bg-primary transition-colors"></div>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-xs font-bold text-white uppercase tracking-tight">{ride.title}</h3>
                                <Badge variant="outline" className="text-[8px] bg-black border-[#2A2D33] text-gray-400 py-0 h-4">
                                    {formatDateTime(ride.departureTime)}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                                <span>{ride.startPoint}</span>
                                <ChevronRight className="w-2 h-2 text-primary" />
                                <span>{ride.destination}</span>
                            </div>
                            {ride.waypoints.length > 0 && (
                                <p className="text-[8px] text-gray-600 italic">via {ride.waypoints.length} waypoints</p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-2 border-primary/30 text-primary hover:bg-primary hover:text-black font-mono text-[9px] uppercase tracking-wider"
                                onClick={() => onStartMission(ride)}
                            >
                                <Play className="w-3 h-3 mr-1 fill-current" /> Enter_Mission
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 w-8 p-0 border-[#2A2D33] hover:border-red-500/50 hover:bg-red-500/10"
                                onClick={() => ride.id && handleDelete(ride.id)}
                            >
                                <Trash2 className="w-3.5 h-3.5 text-gray-600 hover:text-red-500" />
                            </Button>
                        </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        )}
      </AnimatePresence>
    </div>
  );
}
