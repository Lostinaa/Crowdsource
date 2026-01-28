<x-filament-panels::page>
<div id="qoe-map-container">
    <div class="grid grid-cols-1 gap-4">
        <div class="p-4 bg-white rounded-xl shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <div class="flex justify-between items-center">
                <h3 class="text-sm font-bold">Live Map Legend</h3>
                <span id="update-status" class="text-[10px] text-green-500 font-bold animate-pulse">● LIVE UPDATING</span>
            </div>
            <div class="flex flex-wrap gap-4 text-xs font-medium mt-2">
                <div class="flex items-center gap-2"><span style="background-color: #3b82f6; width: 12px; height: 12px; display: inline-block;" class="rounded-full shadow-sm"></span> 5G</div>
                <div class="flex items-center gap-2"><span style="background-color: #22c55e; width: 12px; height: 12px; display: inline-block;" class="rounded-full shadow-sm"></span> 4G / LTE</div>
                <div class="flex items-center gap-2"><span style="background-color: #fbbf24; width: 12px; height: 12px; display: inline-block;" class="rounded-full shadow-sm"></span> 3G</div>
                <div class="flex items-center gap-2"><span style="background-color: #fb5224; width: 12px; height: 12px; display: inline-block;" class="rounded-full shadow-sm"></span> 2G</div>
                <div class="flex items-center gap-2 border-l pl-4 border-gray-300 dark:border-gray-600">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z"/></svg>
                    <span class="text-slate-500">Cell Tower (Static)</span>
                </div>
            </div>
        </div>
      <div id="map" style="height: 750px; width: 100%;" class="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 z-0" wire:ignore></div>
    </div>

    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

    <script>
        document.addEventListener('DOMContentLoaded', function () {
            if (window.leafletMap) return;
            const map = L.map('map').setView([9.01, 38.75], 12); 
            window.leafletMap = map;
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

            const initialData = @json($this->getMapData());
            const staticSites = initialData.sites;
            
            // Layer Group for markers that change (Metrics)
            const metricsLayer = L.layerGroup().addTo(map);
            map.createPane('metricsPane').style.zIndex = 650;
            
            let activeLine = null;

            const towerIcon = L.divIcon({
                html: `<svg viewBox="0 0 24 24" width="30" height="30" fill="#94a3b8"><path d="M12 2L10 6H14L12 2ZM10 7L8 11H16L14 7H10ZM8 12L5 18H19L16 12H8ZM4 19L2 22H22L20 19H4Z"/><circle cx="12" cy="2" r="1" fill="#ef4444"/></svg>`,
                className: '', iconSize: [30, 30], iconAnchor: [15, 30]
            });

            function getDistance(lat1, lon1, lat2, lon2) {
                const R = 6371; 
                const dLat = (lat2-lat1) * Math.PI / 180;
                const dLon = (lon2-lon1) * Math.PI / 180;
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
                return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(2);
            }

            // 1. Render Static Towers once
            if (staticSites) {
                staticSites.forEach(s => {
                    L.marker([s.lat, s.lng], { icon: towerIcon, opacity: 0.8 }).addTo(map).bindPopup(s.info);
                });
            }

            // 2. Function to Render Metrics
            function updateMetricsOnMap(metrics) {
                metricsLayer.clearLayers(); // Remove old dots
                
                metrics.forEach(p => {
                    const marker = L.circleMarker([p.lat, p.lng], {
                        radius: 11, fillColor: p.color, color: "#ffffff", weight: 3, fillOpacity: 0.9, pane: 'metricsPane'
                    });

                    marker.on('mouseover', function() {
                        const searchId = String(p.site_id).trim();
                        const targetSite = staticSites.find(s => String(s.id).trim() === searchId);

                        if (targetSite) {
                            const dist = getDistance(p.lat, p.lng, targetSite.lat, targetSite.lng);
                            if (activeLine) map.removeLayer(activeLine);
                            
                            activeLine = L.polyline([[p.lat, p.lng], [targetSite.lat, targetSite.lng]], {
                                color: p.color, weight: 4, dashArray: '10, 10', opacity: 1
                            }).addTo(map);
                            
                            marker.bindTooltip(`Distance: ${dist} km`, {sticky: true, direction: 'top'}).openTooltip();
                        }
                    });

                    marker.on('mouseout', function() {
                        if (activeLine) { map.removeLayer(activeLine); activeLine = null; }
                        marker.closeTooltip();
                    });

                    marker.bindPopup(p.info);
                    marker.addTo(metricsLayer);
                });
            }

            // Initial render of markers
            updateMetricsOnMap(initialData.metrics);

            // 3. SET INTERVAL FOR 5 SECONDS
            setInterval(async () => {
                try {
                    // Call the PHP function 'getMetricsOnly' via Livewire
                    const newMetrics = await @this.getMetricsOnly();
                    updateMetricsOnMap(newMetrics);
                    console.log("Map metrics updated: " + new Date().toLocaleTimeString());
                } catch (error) {
                    console.error("Live update failed:", error);
                }
            }, 5000); 
        });
    </script>
</div>
</x-filament-panels::page>