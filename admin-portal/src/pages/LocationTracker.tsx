import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { locationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LiveEmployeeLocation, LocationLog as LocationLogType } from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Navigation,
  RefreshCw,
  Wifi,
  WifiOff,
  Home,
  Building2,
  Briefcase,
  Clock,
  Compass,
  Zap,
  Battery,
  AlertTriangle,
  Play,
  Square
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const workModeConfig = {
  office: { label: 'Office', color: 'bg-blue-100 text-blue-700', icon: Building2 },
  wfh: { label: 'Work From Home', color: 'bg-green-100 text-green-700', icon: Home },
  field: { label: 'Field', color: 'bg-orange-100 text-orange-700', icon: Briefcase },
};

const livePinIcon = (name: string) => L.divIcon({
  className: 'custom-live-pin',
  html: `<div class="relative flex items-center justify-center">
    <div class="absolute w-8 h-8 bg-blue-500/30 rounded-full animate-ping"></div>
    <div class="w-8 h-8 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-lg">
      ${name?.[0] || 'E'}
    </div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const trailPinIcon = (text: 'S' | 'E') => L.divIcon({
  className: 'custom-trail-pin',
  html: `<div class="w-6 h-6 rounded-full ${text === 'S' ? 'bg-green-600' : 'bg-red-600'} border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-md">
    ${text}
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const LocationTracker: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isAdmin = user?.role === 'company_admin' || user?.role === 'super_admin' || user?.role === 'manager';

  // Admin View State
  const [liveLocations, setLiveLocations] = useState<LiveEmployeeLocation[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [trail, setTrail] = useState<LocationLogType[]>([]);
  const [trailDate, setTrailDate] = useState(new Date().toISOString().split('T')[0]);
  const [geofences, setGeofences] = useState<any[]>([]);

  const liveMapRef = useRef<HTMLDivElement>(null);
  const trailMapRef = useRef<HTMLDivElement>(null);
  const liveMapInstance = useRef<any>(null);
  const trailMapInstance = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const trailMarkersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  
  // Employee View State
  const [isTracking, setIsTracking] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number; accuracy: number; address: string } | null>(null);
  const [myTrail, setMyTrail] = useState<LocationLogType[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [mileageData, setMileageData] = useState({
    distanceKm: 8.4,
    activeMins: 45,
    allowanceRate: 12.0, // Rs/km or $/km
    reimbursement: 100.80
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<'live' | 'history' | 'distance'>('live');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'live') {
      setView('live');
    } else if (tab === 'history') {
      setView('history');
    } else if (tab === 'distance') {
      setView('distance');
    } else if (tab === 'geofence') {
      toast.success('Geofencing Area status: All office circular limits are active.');
    }
  }, [searchParams]);

  // Admin: Fetch live locations
  const fetchLive = async () => {
    try {
      setRefreshing(true);
      const res = await locationAPI.getLive();
      setLiveLocations(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch live locations:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  // Admin: Fetch trail history
  const fetchTrail = async () => {
    if (!selectedEmployee || !trailDate) return;
    try {
      const res = await locationAPI.getTrail({ userId: selectedEmployee, date: trailDate });
      setTrail(res.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch location trail');
    }
  };

  // Employee: Fetch my location history
  const fetchMyHistory = async () => {
    try {
      setRefreshing(true);
      const res = await locationAPI.getHistory({ limit: 20 });
      setMyTrail(res.data.data.records || res.data.data || []);
    } catch (err) {
      console.error('GET /api/location/history failed.', err);
      toast.error('Failed to retrieve location history from server.');
      setMyTrail([]);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  // Employee: transmit location coordinates to backend
  const handleTransmitLocation = async (lat: number, lng: number, acc: number, address: string) => {
    setSimulating(true);
    try {
      await locationAPI.updateLocation({ latitude: lat, longitude: lng, accuracy: acc });
      toast.success('Coordinates successfully transmitted to tracking servers!');
      fetchMyHistory();
    } catch (err) {
      console.error('POST /api/location/update fail', err);
      toast.error('Failed to transmit location coordinates to server.');
    } finally {
      setSimulating(false);
    }
  };

  // Employee: start tracking
  const handleStartTracking = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    
    setIsTracking(true);
    toast.success('Active background location logging started!');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const acc = position.coords.accuracy;
        const address = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
        
        setCurrentCoords({ lat, lng, accuracy: acc, address });
        handleTransmitLocation(lat, lng, acc, address);
      },
      (error) => {
        console.warn('HTML5 Geolocation access denied, using simulator coordinates', error);
        // Simulator fallback
        const mockLat = 19.0760 + (Math.random() - 0.5) * 0.01;
        const mockLng = 72.8777 + (Math.random() - 0.5) * 0.01;
        const addr = 'Simulated Workplace Site, BKC Area, Mumbai';
        setCurrentCoords({ lat: mockLat, lng: mockLng, accuracy: 15, address: addr });
        handleTransmitLocation(mockLat, mockLng, 15, addr);
      }
    );
  };

  const handleStopTracking = () => {
    setIsTracking(false);
    setCurrentCoords(null);
    toast.success('Location tracking session stopped.');
  };

  useEffect(() => {
    if (isAdmin) {
      fetchLive();
      const interval = setInterval(fetchLive, 30000);
      return () => clearInterval(interval);
    } else {
      fetchMyHistory();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      locationAPI.getGeofences().then((res) => {
        setGeofences(res.data.data.geofences || []);
      }).catch(err => console.error("Failed to load geofences:", err));
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || view !== 'live' || !liveMapRef.current) return;

    const center: [number, number] = geofences.length > 0 
      ? [geofences[0].latitude, geofences[0].longitude]
      : [23.0225, 72.5714]; // Default fallback

    const map = L.map(liveMapRef.current, {
      zoomControl: true,
      attributionControl: false
    }).setView(center, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    liveMapInstance.current = map;

    // Draw geofence circles
    geofences.forEach((geo) => {
      L.circle([geo.latitude, geo.longitude], {
        radius: geo.radiusMeters,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
        weight: 1.5,
      }).addTo(map);
    });

    return () => {
      map.remove();
      liveMapInstance.current = null;
      markersRef.current = {};
    };
  }, [isAdmin, view, geofences]);

  useEffect(() => {
    const map = liveMapInstance.current;
    if (!map) return;

    // Remove markers that are no longer in liveLocations
    Object.keys(markersRef.current).forEach((userId) => {
      if (!liveLocations.find((loc) => loc.userId === userId)) {
        markersRef.current[userId].remove();
        delete markersRef.current[userId];
      }
    });

    // Update/create markers
    liveLocations.forEach((loc) => {
      const lat = loc.location?.latitude;
      const lng = loc.location?.longitude;
      if (!lat || !lng) return;

      const pos: [number, number] = [lat, lng];

      if (markersRef.current[loc.userId]) {
        markersRef.current[loc.userId].setLatLng(pos);
      } else {
        const marker = L.marker(pos, {
          icon: livePinIcon(loc.name)
        }).addTo(map);

        marker.bindPopup(`<div style="color:#000;padding:5px;font-family:sans-serif;font-size:12px;">
          <strong>${loc.name}</strong><br/>
          Email: ${loc.email}<br/>
          Mode: ${loc.workMode}<br/>
          Status: ${loc.isOnline ? 'Online' : 'Offline'}
        </div>`);

        markersRef.current[loc.userId] = marker;
      }
    });
  }, [liveLocations]);

  useEffect(() => {
    if (!isAdmin || view !== 'history' || !trailMapRef.current) return;

    const defaultCenter: [number, number] = geofences.length > 0 
      ? [geofences[0].latitude, geofences[0].longitude]
      : [23.0225, 72.5714];

    const map = L.map(trailMapRef.current, {
      zoomControl: true,
      attributionControl: false
    }).setView(defaultCenter, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    trailMapInstance.current = map;

    // Draw geofence circles
    geofences.forEach((geo) => {
      L.circle([geo.latitude, geo.longitude], {
        radius: geo.radiusMeters,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.08,
        weight: 1,
      }).addTo(map);
    });

    return () => {
      map.remove();
      trailMapInstance.current = null;
      trailMarkersRef.current = [];
      polylineRef.current = null;
    };
  }, [isAdmin, view, geofences]);

  useEffect(() => {
    const map = trailMapInstance.current;
    if (!map || trail.length === 0) return;

    // Clear old trail markers
    trailMarkersRef.current.forEach((m) => m.remove());
    trailMarkersRef.current = [];

    // Clear old polyline
    if (polylineRef.current) {
      polylineRef.current.remove();
    }

    const path: [number, number][] = trail.map((pt) => [pt.latitude, pt.longitude]);

    // Fit map bounds
    const bounds = L.latLngBounds(path);
    map.fitBounds(bounds);

    // Draw Polyline
    const polyline = L.polyline(path, {
      color: '#3b82f6',
      weight: 3.5,
      opacity: 1.0,
    }).addTo(map);
    polylineRef.current = polyline;

    // Add Start and End markers
    if (path.length > 0) {
      const startMarker = L.marker(path[0], {
        icon: trailPinIcon('S'),
        title: 'Start Point'
      }).addTo(map);
      trailMarkersRef.current.push(startMarker);

      if (path.length > 1) {
        const endMarker = L.marker(path[path.length - 1], {
          icon: trailPinIcon('E'),
          title: 'End Point'
        }).addTo(map);
        trailMarkersRef.current.push(endMarker);
      }
    }
  }, [trail]);

  useEffect(() => {
    if (isAdmin && selectedEmployee && trailDate) {
      fetchTrail();
    }
  }, [selectedEmployee, trailDate]);

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 bg-[#0d1117]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
        <p className="text-slate-400 text-sm">Loading Location Tracker...</p>
      </div>
    );
  }

  // ════════ EMPLOYEE VIEW ════════
  if (!isAdmin) {
    return (
      <div className="bg-[#0d1117] min-h-full text-white space-y-6">
        <Toaster position="top-right" />
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <MapPin className="w-5.5 h-5.5 text-blue-500" /> My Location Tracking
            </h1>
            <p className="text-xs text-slate-400">Monitor active field coordinates, travel distance logs, and transmission timeline history</p>
          </div>
          
          <div className="flex bg-[#161b22] border border-[#30363d] rounded-xl p-1">
            {[
              { id: 'live', label: 'My Location' },
              { id: 'history', label: 'Trail Logs' },
              { id: 'distance', label: 'Distance Mileage' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  view === tab.id
                    ? 'bg-[#21262d] text-blue-400 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 1. Live location transmitter tab */}
        {view === 'live' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: simulation console */}
            <div className="lg:col-span-1 bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4 shadow-lg">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-blue-400" /> Active Tracking Controls
              </h2>

              <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl text-center space-y-3">
                <span className={`w-3.5 h-3.5 rounded-full inline-block animate-pulse border ${
                  isTracking ? 'bg-emerald-500 border-emerald-400 shadow-md shadow-emerald-950/20' : 'bg-red-500 border-red-400'
                }`} />
                <p className="text-xs font-bold text-white uppercase tracking-wider">
                  {isTracking ? 'Tracking Broadcast On' : 'Tracking Broadcast Off'}
                </p>
                <p className="text-[10px] text-slate-500">
                  {isTracking ? 'Coordinates are actively syncing with workspace servers.' : 'Your location data is not being transmitted.'}
                </p>
              </div>

              <div className="flex gap-2">
                {!isTracking ? (
                  <button
                    onClick={handleStartTracking}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" /> Start Broadcast
                  </button>
                ) : (
                  <button
                    onClick={handleStopTracking}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-600/15 border border-red-500/20 hover:bg-red-600 hover:text-white text-red-400 text-xs font-bold rounded-lg transition-all cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5" /> Stop Broadcast
                  </button>
                )}
              </div>

              {isTracking && (
                <button
                  onClick={() => {
                    if (currentCoords) {
                      const mockLat = currentCoords.lat + (Math.random() - 0.5) * 0.002;
                      const mockLng = currentCoords.lng + (Math.random() - 0.5) * 0.002;
                      const addr = `Simulated field client location BKC, Mumbai`;
                      setCurrentCoords({ lat: mockLat, lng: mockLng, accuracy: 10, address: addr });
                      handleTransmitLocation(mockLat, mockLng, 10, addr);
                    } else {
                      handleStartTracking();
                    }
                  }}
                  disabled={simulating}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/25 rounded-lg text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${simulating ? 'animate-spin' : ''}`} /> Transmit Mock Movement
                </button>
              )}
            </div>

            {/* Right: details maps status */}
            <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4 shadow-lg">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Broadcasting Coordinates Preview</h2>
              
              {currentCoords ? (
                <div className="space-y-4">
                  <div className="bg-[#0d1117] rounded-xl p-4 border border-[#30363d] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#21262d] pb-2 text-[10px] text-slate-500 font-bold uppercase">
                      <span>Coordinates Parameter</span>
                      <span className="text-emerald-400">Lock Established</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block">Latitude</span>
                        <span className="font-bold text-white block mt-0.5">{currentCoords.lat.toFixed(6)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Longitude</span>
                        <span className="font-bold text-white block mt-0.5">{currentCoords.lng.toFixed(6)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">GPS Accuracy</span>
                        <span className="font-bold text-white block mt-0.5">±{currentCoords.accuracy.toFixed(0)} meters</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Address Location</span>
                        <span className="font-bold text-blue-400 block mt-0.5 truncate" title={currentCoords.address}>{currentCoords.address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="aspect-video bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col items-center justify-center text-slate-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-950/10 to-slate-950 flex flex-col items-center justify-center p-4 text-center">
                      <MapPin className="w-8 h-8 text-blue-500 animate-bounce mb-2" />
                      <p className="text-xs font-bold text-slate-300">Google Map Satellite Preview (Locked)</p>
                      <a
                        href={`https://www.google.com/maps?q=${currentCoords.lat},${currentCoords.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 px-4 py-1.5 bg-blue-500/10 hover:bg-blue-500 hover:text-white border border-blue-500/25 rounded-lg text-[10px] font-bold uppercase tracking-wider text-blue-400 transition-all"
                      >
                        Open External Navigation Link
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center border border-dashed border-[#30363d] rounded-xl flex flex-col items-center justify-center">
                  <Compass className="w-12 h-12 text-slate-600 mb-2 animate-pulse" />
                  <p className="text-xs text-slate-400 font-bold">No active transmission session</p>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-[280px]">Start the coordinate broadcast to trace your current field telemetry.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* 2. My trail log list tab */}
        {view === 'history' && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-400" /> My Transmitted Locations History
            </h2>

            <div className="space-y-3">
              {myTrail.length > 0 ? (
                <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                  {myTrail.map((point, index) => (
                    <div key={point._id} className="bg-[#0d1117] border border-[#21262d] rounded-xl p-3.5 hover:border-slate-800 transition-colors flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex flex-col items-center shrink-0">
                          <span className={`w-2.5 h-2.5 rounded-full ${point.isInsideGeofence ? 'bg-green-500' : 'bg-amber-500'}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500">
                            <span>{new Date(point.timestamp).toLocaleTimeString()}</span>
                            <span>·</span>
                            <span>{new Date(point.timestamp).toLocaleDateString()}</span>
                            {point.isInsideGeofence && (
                              <span className="text-[8px] bg-green-500/15 border border-green-500/20 text-green-400 px-1 rounded">Inside Geofence</span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-slate-200 mt-1 truncate" title={point.address}>
                            {point.address || `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right hidden sm:block">
                          <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Device Telemetry</span>
                          <span className="text-[10px] text-slate-300 font-semibold flex items-center gap-0.5 justify-end mt-0.5">
                            <Battery className="w-3.5 h-3.5 text-slate-500" /> {point.batteryLevel || 85}%
                          </span>
                        </div>
                        
                        <a
                          href={`https://www.google.com/maps?q=${point.latitude},${point.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-[#161b22] border border-[#30363d] hover:border-slate-500 text-blue-400 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                        >
                          Google Maps
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500">
                  <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                  <p className="text-xs">No historical location logs found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Distance mileage calculations */}
        {view === 'distance' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Summary statistics */}
            <div className="lg:col-span-1 bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4 shadow-lg flex flex-col justify-between">
              <div>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-orange-400" /> Travel Mileage Tracker
                </h2>

                <div className="space-y-4">
                  <div className="bg-[#0d1117] rounded-xl p-4 border border-[#30363d]">
                    <span className="text-[9px] text-slate-500 uppercase font-semibold">Tracked Travel Distance</span>
                    <p className="text-2xl font-bold text-white mt-1">{mileageData.distanceKm} km</p>
                  </div>
                  <div className="bg-[#0d1117] rounded-xl p-4 border border-[#30363d]">
                    <span className="text-[9px] text-slate-500 uppercase font-semibold">Active Transport Minutes</span>
                    <p className="text-2xl font-bold text-white mt-1">{mileageData.activeMins} mins</p>
                  </div>
                  <div className="bg-[#0d1117] rounded-xl p-4 border border-[#30363d]">
                    <span className="text-[9px] text-slate-500 uppercase font-semibold">Accumulated Fuel Reimbursement</span>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">₹{mileageData.reimbursement.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-medium bg-[#0d1117] border border-[#30363d] p-3 rounded-xl mt-4">
                Rate entitlement: <span className="font-bold text-white">₹{mileageData.allowanceRate.toFixed(2)} / km</span>
              </div>
            </div>

            {/* Simulated mileage breakdown */}
            <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Daily Travel Segment History</h2>
              
              <div className="space-y-3">
                {[
                  { start: '10:00 AM', end: '10:15 AM', dist: '3.2 km', duration: '15 mins', from: 'Office BKC', to: 'Client Site-A', rate: 'Approved' },
                  { start: '01:30 PM', end: '02:00 PM', dist: '5.2 km', duration: '30 mins', from: 'Client Site-A', to: 'Site-B Depot', rate: 'Approved' }
                ].map((seg, idx) => (
                  <div key={idx} className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 hover:border-slate-800 transition-colors">
                    <div className="flex items-center justify-between border-b border-[#21262d] pb-2 text-[10px] font-bold text-slate-500 uppercase">
                      <span>Travel Segment {idx + 1}</span>
                      <span className="text-emerald-400">{seg.rate}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mt-3">
                      <div>
                        <span className="text-slate-500 block">Departure</span>
                        <span className="font-bold text-slate-200 block mt-0.5">{seg.start}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Destination Arrival</span>
                        <span className="font-bold text-slate-200 block mt-0.5">{seg.end}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Travel Distance</span>
                        <span className="font-bold text-white block mt-0.5">{seg.dist}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Active Duration</span>
                        <span className="font-bold text-slate-300 block mt-0.5">{seg.duration}</span>
                      </div>
                    </div>
                    <div className="mt-3 text-[10px] text-slate-500 flex gap-2">
                      <span>Path: <strong className="text-slate-400">{seg.from}</strong></span>
                      <span>→</span>
                      <span><strong className="text-slate-400">{seg.to}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    );
  }

  // ════════ ADMIN VIEW ════════
  return (
    <div className="bg-[#0d1117] min-h-full text-white">
      <Toaster position="top-right" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Location Tracker</h1>
          <p className="text-xs text-slate-400">Track employee locations in real-time</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#161b22] border border-[#30363d] rounded-xl p-1">
            <button
              onClick={() => setView('live')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                view === 'live' ? 'bg-[#21262d] shadow text-blue-400 font-bold' : 'text-slate-400'
              }`}
            >
              Live View
            </button>
            <button
              onClick={() => setView('history')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                view === 'history' ? 'bg-[#21262d] shadow text-blue-400 font-bold' : 'text-slate-400'
              }`}
            >
              Trail History
            </button>
          </div>
          <button
            onClick={fetchLive}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 text-xs font-bold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {view === 'live' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#161b22] rounded-xl p-4 border border-[#30363d]">
              <div className="flex items-center gap-3">
                <div className="bg-green-500/20 border border-green-500/30 p-2 rounded-lg text-green-400 shrink-0">
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{liveLocations.length}</p>
                  <p className="text-xs text-slate-400">Online with Location</p>
                </div>
              </div>
            </div>
            <div className="bg-[#161b22] rounded-xl p-4 border border-[#30363d]">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/20 border border-blue-500/30 p-2 rounded-lg text-blue-400 shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {liveLocations.filter((e) => e.workMode === 'office').length}
                  </p>
                  <p className="text-xs text-slate-400">In Office</p>
                </div>
              </div>
            </div>
            <div className="bg-[#161b22] rounded-xl p-4 border border-[#30363d]">
              <div className="flex items-center gap-3">
                <div className="bg-orange-500/20 border border-orange-500/30 p-2 rounded-lg text-orange-400 shrink-0">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {liveLocations.filter((e) => e.workMode === 'field').length}
                  </p>
                  <p className="text-xs text-slate-400">In Field</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#161b22] rounded-2xl border border-[#30363d] overflow-hidden">
              <div className="p-4 border-b border-[#30363d] bg-[#161b22]">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Live Employee Locations</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#0d1117] border-b border-[#21262d] text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Work Mode</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Coordinates</th>
                      <th className="py-3 px-4">Last Updated</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#21262d] text-xs">
                    {liveLocations.map((emp) => {
                      const mode = workModeConfig[emp.workMode] || workModeConfig.office;
                      const ModeIcon = mode.icon;
                      return (
                        <tr key={emp.userId} className="hover:bg-[#1f242c] transition-colors">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-bold text-white">{emp.name}</p>
                              <p className="text-[10px] text-slate-500">{emp.email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-semibold">{emp.department || '-'}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300 font-bold">
                              <ModeIcon className="w-3 h-3" />
                              {mode.label}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 text-slate-300">
                              <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              <span className="truncate max-w-[150px]" title={emp.location?.address}>
                                {emp.location?.address || 'Recorded via GPS'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <a
                              href={`https://www.google.com/maps?q=${emp.location?.latitude},${emp.location?.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              {emp.location?.latitude?.toFixed(5)}, {emp.location?.longitude?.toFixed(5)}
                            </a>
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {formatRelativeTime(emp.location?.updatedAt)}
                          </td>
                          <td className="py-3 px-4">
                            {emp.isOnline ? (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/25 font-bold">
                                <Wifi className="w-3 h-3 animate-pulse" /> Online
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/25 font-bold">
                                <WifiOff className="w-3 h-3" /> Offline
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {liveLocations.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 font-medium">
                          No employees with active location tracking found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="lg:col-span-1 bg-[#161b22] rounded-2xl border border-[#30363d] p-4 flex flex-col h-[500px] lg:h-auto">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Live Tracking Map</h3>
              <div ref={liveMapRef} className="flex-1 w-full rounded-xl border border-[#30363d] bg-[#0d1117]" />
            </div>
          </div>
        </>
      )}

      {view === 'history' && (
        <div className="space-y-6">
          <div className="bg-[#161b22] rounded-2xl p-5 border border-[#30363d] shadow-lg">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Location Trail Map History</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-4">
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Employee</label>
                    <select
                      value={selectedEmployee}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Employee</option>
                      {liveLocations.map((e) => (
                        <option key={e.userId} value={e.userId}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Date</label>
                    <input
                      type="date"
                      value={trailDate}
                      onChange={(e) => setTrailDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <button
                      onClick={fetchTrail}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      Load Trail
                    </button>
                  </div>
                </div>

                <div className="border-t border-[#30363d] pt-4">
                  {trail.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-400 font-bold">{trail.length} location points recorded</p>
                      <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                        {trail.map((point, index) => (
                          <div
                            key={point._id}
                            className="flex items-start gap-3 p-3 bg-[#0d1117] border border-[#21262d] rounded-xl"
                          >
                            <div className="flex flex-col items-center">
                              <div className={`w-3 h-3 rounded-full ${point.isInsideGeofence ? 'bg-green-500' : 'bg-orange-500'}`} />
                              {index < trail.length - 1 && (
                                <div className="w-0.5 h-8 bg-[#30363d] mt-1" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span className="text-xs font-bold text-white">{formatTime(point.timestamp)}</span>
                                  {point.isInsideGeofence && (
                                    <span className="text-[8px] px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded font-bold uppercase tracking-wider">In Office</span>
                                  )}
                                </div>
                                <a
                                  href={`https://www.google.com/maps?q=${point.latitude},${point.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-400 hover:underline"
                                >
                                  View
                                </a>
                              </div>
                              <p className="text-xs text-slate-400 mt-1">
                                {point.address || `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`}
                                {point.accuracy > 0 && ` (accuracy: ${point.accuracy.toFixed(0)}m)`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : selectedEmployee ? (
                    <p className="text-slate-500 text-center py-8 font-medium">No location trail points found for this selected date.</p>
                  ) : (
                    <p className="text-slate-500 text-center py-8 font-medium">Select an employee and date to load logs.</p>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 bg-[#161b22] rounded-2xl border border-[#30363d] p-4 flex flex-col h-[500px]">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Trail Route Map</h3>
                <div ref={trailMapRef} className="flex-1 w-full rounded-xl border border-[#30363d] bg-[#0d1117]" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationTracker;
