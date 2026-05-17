import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap, Popup } from 'react-leaflet';
import L from '../lib/leaflet-config';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { calculateDistance } from '../rideService';
import { Navigation, MapPin, Play, Square, Timer, Fuel, Hotel, Wrench, Search, DownloadCloud, Crosshair, Flag, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { formatDistance, formatDuration } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { OfflineMapService } from '../lib/offlineMaps';
import { Input } from '@/components/ui/input';

interface POI {
  id: number;
  lat: number;
  lon: number;
  type: 'fuel' | 'hotel' | 'service';
  name?: string;
}

import { RideRecord, PlannedRide } from '../types';

interface ActiveRideProps {
  plannedRide?: PlannedRide;
  onRideEnd: (ride: {
    distance: number;
    path: [number, number][];
    startTime: number;
    endTime: number;
    stops: [number, number][];
  }) => void;
}

const poiIcons = {
  fuel: L.divIcon({ html: '<div class="bg-blue-500 p-1.5 rounded-full border-2 border-white text-white shadow-lg"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22L15 22"/><path d="M4 9L14 9"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/></svg></div>', className: '', iconSize: [24, 24] }),
  hotel: L.divIcon({ html: '<div class="bg-purple-500 p-1.5 rounded-full border-2 border-white text-white shadow-lg"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2h18v20H3z"/><path d="M9 2v20"/><path d="M15 2v20"/><path d="M3 12h18"/><path d="M3 7h18"/><path d="M3 17h18"/></svg></div>', className: '', iconSize: [24, 24] }),
  service: L.divIcon({ html: '<div class="bg-orange-500 p-1.5 rounded-full border-2 border-white text-white shadow-lg"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div>', className: '', iconSize: [24, 24] }),
};

const LocationMarker = ({ position, follow }: { position: [number, number] | null, follow: boolean }) => {
  const map = useMap();
  useEffect(() => {
    if (position && follow) map.flyTo(position, 15);
  }, [position, follow]);

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
};

const FocusController = ({ target }: { target: [number, number] | null }) => {
    const map = useMap();
    useEffect(() => {
      if (target) map.flyTo(target, 16);
    }, [target]);
    return null;
};

export default function ActiveRide({ onRideEnd, plannedRide }: ActiveRideProps) {
  const [isActive, setIsActive] = useState(false);
  const [path, setPath] = useState<[number, number][]>([]);
  const [plannedPath, setPlannedPath] = useState<[number, number][]>([]);
  const [targetCoords, setTargetCoords] = useState<[number, number][]>([]);
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
  const [followUser, setFollowUser] = useState(true);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [distance, setDistance] = useState(0);
  const [stops, setStops] = useState<[number, number][]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [pois, setPois] = useState<POI[]>([]);
  const [showPOIs, setShowPOIs] = useState({ fuel: true, hotel: true, service: true });
  const [loadingPOIs, setLoadingPOIs] = useState(false);

  const trackerRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastPosRef = useRef<[number, number] | null>(null);
  const navigationDataRef = useRef({ targetCoords, currentTargetIndex });

  useEffect(() => {
    navigationDataRef.current = { targetCoords, currentTargetIndex };
  }, [targetCoords, currentTargetIndex]);

  const fetchPOIs = useCallback(async (lat: number, lon: number) => {
    if (loadingPOIs) return;
    setLoadingPOIs(true);
    try {
        const radius = 5000; // 5km
        const query = `[out:json];
            (
                node["amenity"="fuel"](around:${radius},${lat},${lon});
                node["tourism"="hotel"](around:${radius},${lat},${lon});
                node["shop"="motorcycle"](around:${radius},${lat},${lon});
                node["craft"="motorcycle_repair"](around:${radius},${lat},${lon});
            );
            out body;`;
        
        const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
        const data = await res.json();
        const results: POI[] = data.elements.map((el: any) => ({
            id: el.id,
            lat: el.lat,
            lon: el.lon,
            type: el.tags.amenity === 'fuel' ? 'fuel' : el.tags.tourism === 'hotel' ? 'hotel' : 'service',
            name: el.tags.name || 'Unknown'
        }));
        setPois(results);
    } catch (err) {
        console.error("Failed to fetch POIs", err);
    } finally {
        setLoadingPOIs(false);
    }
  }, [loadingPOIs]);

  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ completed: 0, total: 0 });
  const [downloadRadius, setDownloadRadius] = useState(2);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [focusTarget, setFocusTarget] = useState<[number, number] | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [manualQuery, setManualQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const fetchRoute = useCallback(async (start: string | [number, number], end: string | [number, number], waypoints: (string | [number, number])[]) => {
    setLoadingRoute(true);
    try {
        const geocode = async (query: string | [number, number]): Promise<[number, number] | null> => {
            if (Array.isArray(query)) return query;
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const data = await res.json();
            if (data && data[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            return null;
        };

        const startCoords = await geocode(start);
        const endCoords = await geocode(end);
        if (!startCoords || !endCoords) return;

        const wpCoords = [];
        for (const wp of waypoints) {
            const coords = await geocode(wp);
            if (coords) wpCoords.push(coords);
        }

        const allPoints = [startCoords, ...wpCoords, endCoords];
        setTargetCoords(allPoints);
        setCurrentTargetIndex(1); // Start by heading to the first point after start

        const coordString = allPoints.map(p => `${p[1]},${p[0]}`).join(';');
        const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`);
        const osrmData = await osrmRes.json();
        
        if (osrmData.routes && osrmData.routes[0]) {
            const coords = osrmData.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
            setPlannedPath(coords);
        }
    } catch (err) {
        console.error("Failed to fetch planned route", err);
    } finally {
        setLoadingRoute(false);
    }
  }, []);

  const handleManualSearch = async (val: string) => {
    setManualQuery(val);
    if (val.length < 3) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error(err);
    }
  };

  const selectNewDestination = (item: any) => {
      if (!currentPos) return;
      const destCoords: [number, number] = [parseFloat(item.lat), parseFloat(item.lon)];
      fetchRoute(currentPos, destCoords, []);
      setShowManualSearch(false);
      setManualQuery('');
      setSearchResults([]);
  };

  useEffect(() => {
    if (plannedRide) {
        fetchRoute(plannedRide.startPoint, plannedRide.destination, plannedRide.waypoints);
    }
  }, [plannedRide, fetchRoute]);

  const focusNearestPOI = useCallback((type: 'fuel' | 'hotel' | 'service') => {
    if (!currentPos || pois.length === 0) return;
    
    const relevantPOIs = pois.filter(p => p.type === type);
    if (relevantPOIs.length === 0) return;

    // Find nearest
    let nearest = relevantPOIs[0];
    let minDist = calculateDistance(currentPos[0], currentPos[1], nearest.lat, nearest.lon);

    relevantPOIs.forEach(p => {
        const d = calculateDistance(currentPos[0], currentPos[1], p.lat, p.lon);
        if (d < minDist) {
            minDist = d;
            nearest = p;
        }
    });

    setFocusTarget([nearest.lat, nearest.lon]);
    setShowPOIs(prev => ({ ...prev, [type]: true }));
    // Reset focusTarget after a delay or immediately to allow re-triggering
    setTimeout(() => setFocusTarget(null), 100);
  }, [currentPos, pois]);

  const handleOfflineDownload = async () => {
    if (!currentPos || downloading) return;
    setDownloading(true);
    setDownloadProgress({ completed: 0, total: 0 });
    try {
      await OfflineMapService.cacheRegion(currentPos, 15, downloadRadius, (completed, total) => {
        setDownloadProgress({ completed, total });
      });
      alert("Regional map cached successfully");
      setShowDownloadMenu(false);
    } catch (err) {
      alert("Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const startRide = useCallback(() => {
    setIsActive(true);
    setStartTime(Date.now());
    setPath([]);
    setDistance(0);
    setStops([]);
    setElapsedTime(0);
    
    if (navigator.geolocation) {
      // Start tracking
      watchIdRef.current = navigator.geolocation.watchPosition((pos) => {
        const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setCurrentPos(newPos);

        // Movement logic
        if (lastPosRef.current) {
            const d = calculateDistance(lastPosRef.current[0], lastPosRef.current[1], newPos[0], newPos[1]);
            if (d > 0.005) { // 5 meters
                setDistance(prev => prev + d);
                setPath(prev => [...prev, newPos]);
                lastPosRef.current = newPos;
            }
        } else {
            setPath([newPos]);
            lastPosRef.current = newPos;
            fetchPOIs(newPos[0], newPos[1]);
        }

        // Proximity logic for waypoints
        const { targetCoords: tc, currentTargetIndex: cti } = navigationDataRef.current;
        if (tc.length > 0 && cti < tc.length) {
          const target = tc[cti];
          const distToTarget = calculateDistance(newPos[0], newPos[1], target[0], target[1]);
          if (distToTarget < 0.1) { // 100 meters
            setCurrentTargetIndex(prev => prev + 1);
          }
        }
      }, (err) => console.error(err), { enableHighAccuracy: true, distanceFilter: 5 });

      // Secondary timer for elapsed time
      trackerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1000);
      }, 1000);
    }
  }, [fetchPOIs]);

  const stopRide = useCallback(() => {
    setIsActive(false);
    if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
    }
    if (trackerRef.current) {
        clearInterval(trackerRef.current);
        trackerRef.current = null;
    }
    lastPosRef.current = null;

    if (startTime) {
      onRideEnd({
        distance,
        path,
        startTime,
        endTime: Date.now(),
        stops
      });
    }
  }, [distance, path, startTime, onRideEnd, stops]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
        if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
        if (trackerRef.current) clearInterval(trackerRef.current);
    };
  }, []);

  // Stable refs for callbacks to prevent effect churn
  const callbacksRef = useRef({ startRide, stopRide, focusNearestPOI });
  useEffect(() => {
    callbacksRef.current = { startRide, stopRide, focusNearestPOI };
  });

  useEffect(() => {
    const handleVoiceEvent = (e: any) => {
      const command = e.detail;
      const { startRide: sr, stopRide: st, focusNearestPOI: fp } = callbacksRef.current;
      
      if (command === 'start' && !isActive) {
        sr();
      } else if (command === 'stop' && isActive) {
        st();
      } else if (command === 'nav-fuel') {
        fp('fuel');
      } else if (command === 'nav-hotel') {
        fp('hotel');
      } else if (command === 'nav-service') {
        fp('service');
      }
    };

    window.addEventListener('ride-command', handleVoiceEvent);
    return () => window.removeEventListener('ride-command', handleVoiceEvent);
  }, [isActive]);

  return (
    <div className="flex flex-col h-full space-y-4">
      <Card className="border-primary/20 bg-background/50 backdrop-blur-xl h-[450px] relative overflow-hidden">
        {/* Manual Destination Search Overlay */}
        <div className="absolute top-4 left-4 right-16 z-[500]">
           <div className={`transition-all duration-300 relative ${showManualSearch ? 'bg-black/90 p-2 rounded-sm' : ''}`}>
               {!showManualSearch ? (
                   <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-black/60 border-[#2A2D33] text-primary h-8 gap-2 font-mono text-[10px] uppercase tracking-widest pl-2"
                    onClick={() => setShowManualSearch(true)}
                   >
                     <Search className="w-3.5 h-3.5" /> Search_Destination
                   </Button>
               ) : (
                   <div className="space-y-2">
                       <div className="flex items-center gap-2">
                           <Input 
                             autoFocus
                             className="h-8 bg-black/40 border-[#2A2D33] text-xs font-mono"
                             placeholder="Search location..."
                             value={manualQuery}
                             onChange={(e) => handleManualSearch(e.target.value)}
                           />
                           <Button size="sm" variant="ghost" className="h-8 text-gray-500 hover:text-white" onClick={() => setShowManualSearch(false)}>
                               Cancel
                           </Button>
                       </div>
                       <div className="max-h-40 overflow-y-auto space-y-1">
                           {searchResults.map((item, i) => (
                               <button 
                                 key={i} 
                                 className="w-full text-left p-2 hover:bg-white/5 rounded-sm border-b border-white/5 flex gap-2 items-start"
                                 onClick={() => selectNewDestination(item)}
                               >
                                   <MapPin className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                                   <div className="flex flex-col">
                                       <span className="text-[10px] text-gray-200 font-mono leading-tight">{item.display_name}</span>
                                       <span className="text-[8px] text-gray-500 uppercase font-mono mt-0.5">LAT:{parseFloat(item.lat).toFixed(4)} LON:{parseFloat(item.lon).toFixed(4)}</span>
                                   </div>
                               </button>
                           ))}
                       </div>
                   </div>
               )}
           </div>
        </div>

        <MapContainer center={[0, 0]} zoom={15} className="h-full w-full z-0" zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={currentPos} follow={followUser} />
          <FocusController target={focusTarget} />
          {plannedPath.length > 0 && <Polyline positions={plannedPath} color="#4F46E5" weight={4} opacity={0.6} dashArray="10, 10" />}
          {path.length > 1 && <Polyline positions={path} color="#C8FF00" weight={6} opacity={0.9} />}
          
          {pois.map(poi => {
            if (!showPOIs[poi.type]) return null;
            return (
              <Marker key={poi.id} position={[poi.lat, poi.lon]} icon={poiIcons[poi.type]}>
                <Popup className="font-mono text-[10px]">
                  <div className="font-bold text-primary uppercase">{poi.type}</div>
                  <div>{poi.name}</div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {plannedRide && currentPos && targetCoords.length > 0 && currentTargetIndex < targetCoords.length && (
            <div className="absolute top-20 left-4 z-[400] bg-black/80 backdrop-blur-xl border border-[#2A2D33] rounded-sm p-4 flex flex-col gap-3 min-w-[180px] shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#2A2D33] pb-2">
                    <div className="text-[10px] text-primary font-mono font-bold tracking-[0.2em] uppercase flex items-center gap-1.5">
                        <Navigation className="w-3 h-3 animate-pulse" /> Mission_Progress
                    </div>
                    <div className="text-[9px] font-mono text-gray-500">
                        {currentTargetIndex}/{targetCoords.length - 1} OPS
                    </div>
                </div>

                <div className="space-y-3">
                    {/* Next Objective */}
                    <div className="space-y-1">
                        <p className="text-[8px] uppercase text-gray-500 font-mono tracking-widest flex items-center gap-1">
                            Current_Target
                        </p>
                        <div className="flex justify-between items-end">
                            <h4 className="text-xs font-bold text-white truncate max-w-[100px]">
                                {currentTargetIndex === targetCoords.length - 1 
                                    ? plannedRide.destination 
                                    : (plannedRide.waypoints[currentTargetIndex - 1] || 'Point')}
                            </h4>
                            <span className="text-primary font-mono text-sm font-bold">
                                {calculateDistance(
                                    currentPos[0], 
                                    currentPos[1], 
                                    targetCoords[currentTargetIndex][0], 
                                    targetCoords[currentTargetIndex][1]
                                ).toFixed(1)}<span className="text-[9px] ml-0.5">KM</span>
                            </span>
                        </div>
                    </div>

                    {/* Total Distance to Final extraction */}
                    {currentTargetIndex < targetCoords.length - 1 && (
                        <div className="pt-2 border-t border-[#2A2D33]/40">
                            <div className="flex justify-between items-center">
                                <p className="text-[8px] uppercase text-gray-600 font-mono tracking-widest flex items-center gap-1">
                                    <Flag className="w-2.5 h-2.5" /> Extraction
                                </p>
                                <span className="text-gray-400 font-mono text-[10px]">
                                    {calculateDistance(
                                        currentPos[0], 
                                        currentPos[1], 
                                        targetCoords[targetCoords.length - 1][0], 
                                        targetCoords[targetCoords.length - 1][1]
                                    ).toFixed(1)}KM
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <div className="h-1 bg-black rounded-full overflow-hidden border border-[#2A2D33]">
                        <motion.div 
                            className="h-full bg-primary"
                            initial={{ width: '0%' }}
                            animate={{ width: `${(currentTargetIndex / (targetCoords.length - 1)) * 100}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[8px] font-mono text-gray-600 uppercase">
                        <span>Deploy</span>
                        <span>Extract</span>
                    </div>
                </div>
            </div>
        )}
        
        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
            <Badge variant="outline" className="bg-black/80 backdrop-blur uppercase text-[9px] tracking-widest font-mono border-primary/30">
                Live_{loadingPOIs ? 'SCANNING...' : (plannedRide ? 'MISSION_ENGAGED' : 'TELEMETRY')}
            </Badge>
            <div className="flex flex-col gap-1">
                <Button 
                    size="sm" 
                    variant={followUser ? 'default' : 'outline'} 
                    className="h-8 w-8 p-0 rounded-sm border-[#2A2D33] mb-2"
                    onClick={() => setFollowUser(!followUser)}
                    title="Follow User"
                >
                    <Crosshair className={`w-4 h-4 ${followUser ? 'text-black' : 'text-primary'}`} />
                </Button>
                <div className="flex gap-1">
                    <Button 
                        size="sm" 
                        variant={showPOIs.fuel ? 'default' : 'outline'} 
                        className="h-8 w-8 p-0 rounded-sm border-[#2A2D33]"
                        onClick={() => setShowPOIs({...showPOIs, fuel: !showPOIs.fuel})}
                    >
                        <Fuel className="w-4 h-4" />
                    </Button>
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 w-8 p-0 rounded-sm border-[#2A2D33] text-primary"
                        onClick={() => focusNearestPOI('fuel')}
                        disabled={!pois.some(p => p.type === 'fuel')}
                        title="Focus Nearest Fuel"
                    >
                        <Crosshair className="w-3.5 h-3.5" />
                    </Button>
                </div>

                <div className="flex gap-1">
                    <Button 
                        size="sm" 
                        variant={showPOIs.hotel ? 'default' : 'outline'} 
                        className="h-8 w-8 p-0 rounded-sm border-[#2A2D33]"
                        onClick={() => setShowPOIs({...showPOIs, hotel: !showPOIs.hotel})}
                    >
                        <Hotel className="w-4 h-4" />
                    </Button>
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 w-8 p-0 rounded-sm border-[#2A2D33] text-primary"
                        onClick={() => focusNearestPOI('hotel')}
                        disabled={!pois.some(p => p.type === 'hotel')}
                        title="Focus Nearest Hotel"
                    >
                        <Crosshair className="w-3.5 h-3.5" />
                    </Button>
                </div>

                <div className="flex gap-1">
                    <Button 
                        size="sm" 
                        variant={showPOIs.service ? 'default' : 'outline'} 
                        className="h-8 w-8 p-0 rounded-sm border-[#2A2D33]"
                        onClick={() => setShowPOIs({...showPOIs, service: !showPOIs.service})}
                    >
                        <Wrench className="w-4 h-4" />
                    </Button>
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 w-8 p-0 rounded-sm border-[#2A2D33] text-primary"
                        onClick={() => focusNearestPOI('service')}
                        disabled={!pois.some(p => p.type === 'service')}
                        title="Focus Nearest Service"
                    >
                        <Crosshair className="w-3.5 h-3.5" />
                    </Button>
                </div>
                <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 w-8 p-0 rounded-sm border-[#2A2D33] mt-2 text-primary"
                    onClick={() => currentPos && fetchPOIs(currentPos[0], currentPos[1])}
                    disabled={loadingPOIs || !currentPos}
                >
                    <Search className={`w-4 h-4 ${loadingPOIs ? 'animate-spin' : ''}`} />
                </Button>
                <div className="relative">
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className={`h-10 w-10 p-0 rounded-sm border-[#2A2D33] mt-2 ${downloading ? 'animate-pulse' : ''}`}
                        onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                        disabled={!currentPos || downloading}
                        title="Offline Download Settings"
                    >
                        <DownloadCloud className={`w-5 h-5 ${downloading ? 'text-yellow-500' : 'text-blue-400'}`} />
                    </Button>

                    {showDownloadMenu && !downloading && (
                        <div className="absolute right-12 top-0 w-48 bg-black/90 backdrop-blur-xl border border-[#2A2D33] rounded-sm p-3 z-[500] shadow-2xl">
                            <p className="text-[9px] font-mono text-gray-500 uppercase mb-2">Sync_Radius</p>
                            <div className="flex gap-2 mb-3">
                                {[2, 4, 8].map(r => (
                                    <Button 
                                        key={r}
                                        variant={downloadRadius === r ? 'default' : 'outline'}
                                        size="sm"
                                        className="flex-1 h-7 text-[9px] font-mono border-[#2A2D33]"
                                        onClick={() => setDownloadRadius(r)}
                                    >
                                        {r * 2}km
                                    </Button>
                                ))}
                            </div>
                            <Button 
                                className="w-full h-8 text-[10px] font-bold uppercase tracking-widest bg-primary text-black"
                                onClick={handleOfflineDownload}
                            >
                                Start_Sync
                            </Button>
                        </div>
                    )}

                    {downloading && (
                        <div className="absolute right-12 top-0 w-48 bg-black/95 border border-primary/30 rounded-sm p-3 z-[500]">
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[9px] font-mono text-primary animate-pulse">SYNCING_TILES...</span>
                                <span className="text-[9px] font-mono text-gray-400">
                                    {Math.round((downloadProgress.completed / downloadProgress.total) * 100)}%
                                </span>
                            </div>
                            <div className="h-1 bg-black rounded-full overflow-hidden border border-[#2A2D33]">
                                <div 
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${(downloadProgress.completed / downloadProgress.total) * 100}%` }}
                                ></div>
                            </div>
                            <p className="text-[8px] font-mono text-gray-600 mt-1 uppercase text-right">
                                {downloadProgress.completed} / {downloadProgress.total}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {isActive && (
            <div className="absolute bottom-4 left-4 right-4 z-[400] bg-black/90 backdrop-blur-xl border border-[#2A2D33] rounded-xl flex flex-col p-4 shadow-2xl space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex-1 grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Trip Dist</div>
                            <div className="text-xl font-mono text-white leading-none">
                                {distance.toFixed(1)}<span className="text-xs ml-0.5">km</span>
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Duration</div>
                            <div className="text-xl font-mono text-white leading-none whitespace-nowrap">
                                {formatDuration(elapsedTime)}
                            </div>
                        </div>
                    </div>
                    
                    <button 
                    onClick={stopRide}
                    className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20 shrink-0 ml-4"
                    >
                        <div className="w-3.5 h-3.5 bg-white rounded-sm"></div>
                    </button>
                </div>

                {targetCoords.length > 0 && currentTargetIndex < targetCoords.length && currentPos && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="pt-3 border-t border-[#2A2D33]/60 flex items-center justify-between"
                    >
                        <div className="flex flex-col gap-0.5 overflow-hidden">
                            <span className="text-[8px] font-mono text-primary uppercase flex items-center gap-1 leading-none">
                                <Navigation className="w-2.5 h-2.5" /> Next_Objective
                            </span>
                            <span className="text-[10px] text-white font-bold truncate max-w-[150px]">
                                {currentTargetIndex === targetCoords.length - 1 
                                    ? (plannedRide?.destination || 'Destination')
                                    : (plannedRide?.waypoints[currentTargetIndex - 1] || 'Waypoint')}
                            </span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                             <div className="flex flex-col items-end gap-1">
                                <span className="text-primary font-mono text-lg font-bold leading-none">
                                    {calculateDistance(
                                        currentPos[0], 
                                        currentPos[1], 
                                        targetCoords[currentTargetIndex][0], 
                                        targetCoords[currentTargetIndex][1]
                                    ).toFixed(1)}<span className="text-[9px] ml-0.5 uppercase tracking-tighter">KM</span>
                                </span>
                             </div>
                        </div>
                    </motion.div>
                )}
            </div>
        )}
      </Card>

      {!isActive && (
        <Button 
          className="w-full h-16 text-lg font-bold uppercase tracking-widest bg-primary text-black hover:bg-primary/90 shadow-[0_10px_30px_-5px_rgba(200,255,0,0.3)] transition-all active:scale-[0.98]"
          onClick={startRide}
        >
          <Play className="mr-2 fill-current" /> Initialize Session
        </Button>
      )}
    </div>
  );
}
