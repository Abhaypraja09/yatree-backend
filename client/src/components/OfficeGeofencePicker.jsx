import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Navigation, Loader2, Target, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Fix for Leaflet default icon issue in React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const MapUpdater = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
};

const OfficeGeofencePicker = ({ value, onChange }) => {
    const [search, setSearch] = useState(value?.address || '');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const getInitialCoordinate = (val, fallback) => {
        if (!val || val === '' || isNaN(parseFloat(val))) return fallback;
        return parseFloat(val);
    };

    const initialLat = getInitialCoordinate(value?.latitude, 28.6139);
    const initialLng = getInitialCoordinate(value?.longitude, 77.2090);
    const [position, setPosition] = useState([initialLat, initialLng]);
    const [radius, setRadius] = useState(Number(value?.radius) || 200);

    const debounceTimer = useRef(null);

    const fetchSuggestions = async (query, autoSelect = false) => {
        if (!query || query.length < 2) {
            setSuggestions([]);
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
            );
            const data = await response.json();
            setSuggestions(data);
            
            // If autoSelect is requested and we have results, pick the first one
            if (autoSelect && data.length > 0) {
                handleSelectAddress(data[0]);
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearch(val);
        setShowSuggestions(true);

        onChange({
            ...value,
            address: val
        });

        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            fetchSuggestions(val);
        }, 800);
    };

    const handleSearchSubmit = () => {
        if (search.length >= 2) {
            fetchSuggestions(search, true);
        }
    };

    const handleSelectAddress = (suggestion) => {
        const lat = parseFloat(suggestion.lat);
        const lon = parseFloat(suggestion.lon);
        const newPos = [lat, lon];
        
        setPosition(newPos);
        setSearch(suggestion.display_name);
        setSuggestions([]);
        setShowSuggestions(false);

        onChange({
            latitude: lat,
            longitude: lon,
            address: suggestion.display_name,
            radius: radius
        });
    };

    const handleMarkerDragEnd = (e) => {
        const marker = e.target;
        const pos = marker.getLatLng();
        const newPos = [pos.lat, pos.lng];
        setPosition(newPos);

        updateAddressFromCoords(pos.lat, pos.lng);
    };

    const updateAddressFromCoords = async (lat, lng) => {
        setLoading(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            const data = await response.json();
            const addr = data.display_name || 'Selected Location';
            setSearch(addr);
            onChange({
                latitude: lat,
                longitude: lng,
                address: addr,
                radius: radius
            });
        } catch (error) {
            console.error('Error reverse geocoding:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRadiusChange = (e) => {
        const newRadius = parseInt(e.target.value);
        setRadius(newRadius);
        onChange({
            ...value,
            radius: newRadius,
            latitude: position[0],
            longitude: position[1],
            address: search
        });
    };

    const handleLocateMe = () => {
        if ("geolocation" in navigator) {
            setLoading(true);
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const { latitude, longitude } = pos.coords;
                const newPos = [latitude, longitude];
                setPosition(newPos);
                
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    const data = await response.json();
                    const addr = data.display_name || 'Current Location';
                    setSearch(addr);
                    onChange({
                        latitude: latitude,
                        longitude: longitude,
                        address: addr,
                        radius: radius
                    });
                } catch (error) {
                    console.error('Reverse geocoding error:', error);
                } finally {
                    setLoading(false);
                }
            }, (error) => {
                setLoading(false);
                alert("Error getting location: " + error.message);
            }, { enableHighAccuracy: true });
        } else {
            alert("Geolocation is not supported by your browser.");
        }
    };

    return (
        <div className="geofence-picker-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Search Input Section */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search
                        size={18}
                        style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', zIndex: 10 }}
                    />
                    <input
                        type="text"
                        placeholder="Search Office (e.g. City Branch Office)"
                        value={search}
                        onChange={handleSearchChange}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (suggestions.length > 0) {
                                    handleSelectAddress(suggestions[0]);
                                } else {
                                    // If no suggestions, try a direct fetch
                                    fetchSuggestions(search);
                                }
                            }
                        }}
                        onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                        style={{
                            width: '100%',
                            height: '56px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '16px',
                            padding: '0 45px',
                            color: 'white',
                            fontSize: '14px',
                            outline: 'none',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    />
                    {loading && (
                        <Loader2
                            size={18}
                            style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#6366f1', animation: 'spin 1s linear infinite' }}
                        />
                    )}
                    {search && !loading && (
                        <button
                            type="button"
                            onClick={() => { setSearch(''); setSuggestions([]); }}
                            style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                        >
                            <X size={16} />
                        </button>
                    )}

                    <AnimatePresence>
                        {showSuggestions && suggestions.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                style={{
                                    position: 'absolute',
                                    top: '65px',
                                    left: 0,
                                    right: 0,
                                    background: 'rgba(15, 23, 42, 0.98)',
                                    backdropFilter: 'blur(20px)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '16px',
                                    zIndex: 1000,
                                    overflow: 'hidden',
                                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                                }}
                            >
                                {suggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        onClick={() => handleSelectAddress(suggestion)}
                                        style={{
                                            padding: '14px 20px',
                                            cursor: 'pointer',
                                            borderBottom: index === suggestions.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <MapPin size={16} color="#6366f1" style={{ flexShrink: 0 }} />
                                        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {suggestion.display_name}
                                        </span>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <button
                    type="button"
                    onClick={handleLocateMe}
                    disabled={loading}
                    style={{
                        height: '56px',
                        padding: '0 20px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        border: 'none',
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        boxShadow: '0 10px 20px rgba(99, 102, 241, 0.2)',
                        transition: 'all 0.3s ease',
                        whiteSpace: 'nowrap'
                    }}
                >
                    <Target size={18} />
                    <span className="hide-mobile">LOCATE ME</span>
                </button>
            </div>

            {/* Map Preview Section */}
            <div style={{
                height: '350px',
                borderRadius: '24px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)',
                position: 'relative',
                background: '#020617'
            }}>
                <MapContainer
                    center={position}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                >
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <Marker
                        position={position}
                        draggable={true}
                        eventHandlers={{ dragend: handleMarkerDragEnd }}
                    >
                    </Marker>
                    <Circle
                        center={position}
                        radius={radius}
                        pathOptions={{
                            fillColor: '#6366f1',
                            fillOpacity: 0.15,
                            color: '#6366f1',
                            weight: 2,
                            dashArray: '5, 10'
                        }}
                    />
                    <MapUpdater center={position} />
                </MapContainer>

                <div style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    background: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    padding: '6px 12px',
                    zIndex: 400,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 10px #22c55e' }}></div>
                    <span style={{ fontSize: '10px', color: 'white', fontWeight: '600', letterSpacing: '0.5px' }}>LIVE PREVIEW</span>
                </div>

                <div style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '16px',
                    right: '16px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    zIndex: 400,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '6px', borderRadius: '8px' }}>
                            <Target size={16} color="#6366f1" />
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: 'white', fontWeight: '700' }}>{radius}m Radius</div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Allowed Punch-In Area</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Radius Slider Section */}
            <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '20px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Navigation size={16} color="#6366f1" />
                        <span style={{ fontSize: '13px', color: 'white', fontWeight: '700', letterSpacing: '0.5px' }}>RANGE CONTROL</span>
                    </div>
                    <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '4px 10px', borderRadius: '8px', fontSize: '14px', fontWeight: '800' }}>
                        {radius}m
                    </div>
                </div>

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                        type="range"
                        min="50"
                        max="1000"
                        step="10"
                        value={radius}
                        onChange={handleRadiusChange}
                        style={{
                            width: '100%',
                            height: '6px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '3px',
                            appearance: 'none',
                            outline: 'none',
                            cursor: 'pointer',
                            accentColor: '#6366f1'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>
                    <span>50m (STRICT)</span>
                    <span>1000m (RELAXED)</span>
                </div>
            </div>

            {/* Disclaimer */}
            <div style={{ display: 'flex', gap: '10px', padding: '0 8px' }}>
                <Info size={14} color="rgba(99, 102, 241, 0.5)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)', lineHeight: '1.5' }}>
                    Drag the marker on the map to fine-tune the center point. Punch-in will only be allowed within the highlighted circle.
                </p>
            </div>
        </div>
    );
};

export default OfficeGeofencePicker;
