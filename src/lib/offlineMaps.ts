/**
 * SPDX-License-Identifier: Apache-2.0
 */

export const OfflineMapService = {
  cacheRegion: async (center: [number, number], zoom: number, radiusTiles: number = 2, onProgress?: (completed: number, total: number) => void) => {
    if (!('caches' in window)) {
      throw new Error('Cache storage not available');
    }

    const cache = await caches.open('map-tiles-offline');
    const [lat, lon] = center;
    
    // Convert lat/lon to OSM tile coordinates
    const n = Math.pow(2, zoom);
    const xtile = Math.floor((lon + 180) / 360 * n);
    const ytile = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);

    const tiles: string[] = [];
    for (let x = xtile - radiusTiles; x <= xtile + radiusTiles; x++) {
      for (let y = ytile - radiusTiles; y <= ytile + radiusTiles; y++) {
          const subdomains = ['a', 'b', 'c'];
          subdomains.forEach(s => {
              tiles.push(`https://${s}.tile.openstreetmap.org/${zoom}/${x}/${y}.png`);
          });
      }
    }

    let completed = 0;
    const total = tiles.length;
    if (onProgress) onProgress(0, total);

    const poolLimit = 5; // Concurrency limit to avoid overwhelming network
    const chunks = [];
    for (let i = 0; i < tiles.length; i += poolLimit) {
      chunks.push(tiles.slice(i, i + poolLimit));
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map(async (url) => {
        try {
          const response = await fetch(url, { mode: 'cors' });
          if (response.ok) {
            await cache.put(url, response);
            completed++;
            if (onProgress) onProgress(completed, total);
          }
        } catch (err) {
          console.warn(`Failed to cache tile: ${url}`);
          completed++; // Count as attempted
          if (onProgress) onProgress(completed, total);
        }
      }));
    }

    return { completed, total };
  },

  getCacheSize: async () => {
    if (!('caches' in window)) return 0;
    const cache = await caches.open('map-tiles-offline');
    const keys = await cache.keys();
    return keys.length;
  },

  clearCache: async () => {
    if (!('caches' in window)) return;
    await caches.delete('map-tiles-offline');
  }
};
