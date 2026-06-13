import React, { useState, useMemo } from 'react';
import { useCrm } from '../../context/CrmContext';
import { useAgencies } from '../../context/AgenciesContext';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Loader2, Navigation, MapPin, X } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon issue with Webpack/Vite
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom active icon for selected agencies
const SelectedIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export default function MapPage() {
  const { crmData } = useCrm();
  const { agencies: baseAgencies, agenciesLoading } = useAgencies();
  const loading = agenciesLoading;
  
  // Filters
  const [cityFilter, setCityFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  
  // Selected agencies for routing
  const [selectedAgencies, setSelectedAgencies] = useState([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Status filter
  const [statusFilter, setStatusFilter] = useState('');

  // 3. Merge Base Data + CRM Data
  const agencies = useMemo(() => {
    if (!baseAgencies.length) return [];
    return baseAgencies.map(agency => ({
      ...agency,
      ...(crmData[agency.docId] || {})
    }));
  }, [baseAgencies, crmData]);

  // Compute unique cities & districts
  const uniqueCities = useMemo(() => [...new Set(agencies.map(a => a.city))].sort(), [agencies]);
  const uniqueDistricts = useMemo(() => {
    if (!cityFilter) return [];
    return [...new Set(agencies.filter(a => a.city === cityFilter).map(a => a.district))].sort();
  }, [agencies, cityFilter]);

  // Filtered agencies to show on map (only agencies with coords)
  const filteredAgencies = useMemo(() => {
    return agencies.filter(a => {
      if (!a.lat || !a.lng) return false;
      if (cityFilter && a.city !== cityFilter) return false;
      if (districtFilter && a.district !== districtFilter) return false;
      if (statusFilter) {
        const agencyStatus = a.status || 'lead';
        if (agencyStatus !== statusFilter) return false;
      }
      return true;
    });
  }, [agencies, cityFilter, districtFilter, statusFilter]);

  const toggleSelection = (agency) => {
    setSelectedAgencies(prev => {
      const isSelected = prev.some(p => p.docId === agency.docId);
      if (isSelected) return prev.filter(p => p.docId !== agency.docId);
      
      // Limit to 10 waypoints for Google Maps
      if (prev.length >= 10) {
        // Max 10 waypoints
        return prev;
      }
      return [...prev, agency];
    });
  };

  const generateRouteUrl = () => {
    if (selectedAgencies.length < 1) return;
    
    if (selectedAgencies.length === 1) {
      const a = selectedAgencies[0];
      const url = `https://www.google.com/maps/dir/?api=1&destination=${a.lat},${a.lng}`;
      window.open(url, '_blank');
      return;
    }

    const waypoints = selectedAgencies.slice(0, -1).map(a => `${a.lat},${a.lng}`).join('|');
    const destination = selectedAgencies[selectedAgencies.length - 1];
    
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&waypoints=${waypoints}`;
    window.open(url, '_blank');
  };

  const optimizeRoute = async () => {
    if (selectedAgencies.length < 3) return; // En az 3 nokta (başlangıç + bitiş + 1 ara) daha mantıklı, ama 2'de de çalışır.
    
    try {
      setIsOptimizing(true);
      // OSRM requires lng,lat
      const coords = selectedAgencies.map(a => `${a.lng},${a.lat}`).join(';');
      // source=first ile başlangıç noktasını sabitliyoruz
      const res = await fetch(`https://router.project-osrm.org/trip/v1/driving/${coords}?roundtrip=false&source=first`);
      const data = await res.json();

      if (data.code === 'Ok' && data.waypoints) {
        // OSRM waypoints array maps original index to optimized index
        // data.waypoints[i].waypoint_index indicates the new position of the i-th original point
        const sorted = new Array(selectedAgencies.length);
        data.waypoints.forEach((wp, originalIndex) => {
          sorted[wp.waypoint_index] = selectedAgencies[originalIndex];
        });
        setSelectedAgencies(sorted);
      } else {
        throw new Error(data.message || 'API Hatası');
      }
    } catch (err) {
      console.error('Rota optimizasyon hatası:', err);
      alert('Rota optimize edilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsOptimizing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)]">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
        <p className="text-slate-500 font-medium">Harita verileri yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Saha Operasyon Haritası</h1>
          <p className="text-sm text-slate-500 mt-1">
            Ziyaret edilecek acenteleri haritadan seçip rota oluşturun. (Max 10 acente)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={cityFilter}
            onChange={(e) => {
              setCityFilter(e.target.value);
              setDistrictFilter('');
            }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white min-w-[150px] shadow-sm"
          >
            <option value="">Tüm Türkiye</option>
            {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            disabled={!cityFilter}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white min-w-[150px] shadow-sm disabled:bg-slate-50"
          >
            <option value="">Tüm İlçeler</option>
            {uniqueDistricts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white min-w-[150px] shadow-sm"
          >
            <option value="">Tüm Durumlar</option>
            <option value="lead">Potansiyel</option>
            <option value="contacted">İletişime Geçildi</option>
            <option value="contracted">Sözleşmeli</option>
            <option value="not_interested">İlgilenmiyor</option>
            <option value="blacklisted">Kara Liste</option>
          </select>
        </div>
      </div>

      <div className="flex-1 relative min-h-0 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden z-0">
        {/* Map Container */}
        <MapContainer 
          center={[39.0, 35.0]} 
          zoom={6} 
          className="w-full h-full"
          maxZoom={18}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={50}
          >
            {filteredAgencies.map((agency) => {
              const isSelected = selectedAgencies.some(p => p.docId === agency.docId);
              return (
                <Marker 
                  key={agency.docId} 
                  position={[agency.lat, agency.lng]}
                  icon={isSelected ? SelectedIcon : DefaultIcon}
                >
                  <Popup className="rounded-xl">
                    <div className="p-1 min-w-[200px]">
                      <h3 className="font-bold text-slate-800 mb-1 leading-tight">{agency.name}</h3>
                      <p className="text-xs text-slate-500 mb-3">{agency.address}</p>
                      <button
                        onClick={() => toggleSelection(agency)}
                        className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
                          isSelected 
                            ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {isSelected ? 'Rotadan Çıkar' : 'Rotaya Ekle'}
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        </MapContainer>

        {/* Selected Route Sidebar Overlay */}
        <div className="absolute right-4 top-4 bottom-4 w-80 bg-white/95 backdrop-blur-md border border-slate-200/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col z-[1000]">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 rounded-t-2xl">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-600" />
              Ziyaret Rotası
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Seçilen acenteler: <span className="font-bold">{selectedAgencies.length} / 10</span>
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selectedAgencies.length === 0 ? (
              <div className="text-center text-slate-400 mt-10">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Harita üzerinden ziyaret edeceğiniz acenteleri seçin.</p>
              </div>
            ) : (
              selectedAgencies.map((agency, index) => (
                <div key={agency.docId} className="flex gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 relative group">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </div>
                  <div className="pr-6">
                    <p className="text-sm font-semibold text-slate-800 line-clamp-1">{agency.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{agency.district}</p>
                  </div>
                  <button 
                    onClick={() => toggleSelection(agency)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-slate-200 bg-slate-50/50 rounded-b-2xl flex flex-col gap-2">
            <button
              onClick={optimizeRoute}
              disabled={selectedAgencies.length < 3 || isOptimizing}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              {isOptimizing ? 'Optimize Ediliyor...' : 'Rotayı Optimize Et (En Kısa)'}
            </button>
            <button
              onClick={generateRouteUrl}
              disabled={selectedAgencies.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-medium transition-colors shadow-sm"
            >
              <MapPin className="w-4 h-4" />
              Google Haritalar'da Aç
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
