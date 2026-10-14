/**
 * OFFGRID-RESQ – STORAGE ENGINE & DATA STORE
 * Handles LocalStorage persistence, offline outbox queue,
 * simulated network connectivity state, and disaster scenario seeds.
 */

const STORAGE_KEYS = {
  INCIDENTS: 'OFFGRID_RESQ_INCIDENTS_V1',
  OUTBOX_QUEUE: 'OFFGRID_RESQ_OUTBOX_V1',
  DEDUP_LOGS: 'OFFGRID_RESQ_DEDUP_LOGS_V1',
  SETTINGS: 'OFFGRID_RESQ_SETTINGS_V1',
  TELEMETRY_STATS: 'OFFGRID_RESQ_TELEMETRY_V1'
};

class ResqStorage {
  constructor() {
    this.isOfflineSimulated = false; // toggleable by user
    this.initDefaultStorage();
  }

  initDefaultStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.INCIDENTS)) {
      localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.OUTBOX_QUEUE)) {
      localStorage.setItem(STORAGE_KEYS.OUTBOX_QUEUE, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.DEDUP_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.DEDUP_LOGS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TELEMETRY_STATS)) {
      const initialStats = {
        totalBroadcasts: 0,
        duplicatesSuppressed: 0,
        bytesConserved: 0,
        packetsDelivered: 0,
        meshHopsTotal: 0
      };
      localStorage.setItem(STORAGE_KEYS.TELEMETRY_STATS, JSON.stringify(initialStats));
    }
  }

  // Network State
  isOfflineMode() {
    // True if browser is offline OR user switched on simulated grid failure
    return !navigator.onLine || this.isOfflineSimulated;
  }

  setSimulatedOffline(status) {
    this.isOfflineSimulated = Boolean(status);
  }

  // Incident Operations
  getIncidents() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INCIDENTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed reading incidents from localStorage', e);
      return [];
    }
  }

  saveIncidents(incidents) {
    try {
      localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(incidents));
    } catch (e) {
      console.error('Failed saving incidents to localStorage', e);
    }
  }

  addIncident(incident) {
    const list = this.getIncidents();
    // Add to front of queue
    list.unshift(incident);
    this.saveIncidents(list);
    return incident;
  }

  updateIncident(incidentId, updateFields) {
    const list = this.getIncidents();
    const index = list.findIndex(item => item.id === incidentId);
    if (index !== -1) {
      list[index] = { ...list[index], ...updateFields, lastUpdated: new Date().toISOString() };
      this.saveIncidents(list);
      return list[index];
    }
    return null;
  }

  getIncidentById(incidentId) {
    const list = this.getIncidents();
    return list.find(item => item.id === incidentId) || null;
  }

  // Outbox (Offline Queue) Operations
  getOutboxQueue() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.OUTBOX_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  addToOutbox(sosPacket) {
    const queue = this.getOutboxQueue();
    queue.push(sosPacket);
    localStorage.setItem(STORAGE_KEYS.OUTBOX_QUEUE, JSON.stringify(queue));
    return queue.length;
  }

  clearOutbox() {
    localStorage.setItem(STORAGE_KEYS.OUTBOX_QUEUE, JSON.stringify([]));
  }

  // Deduplication & Telemetry Logging
  getDedupLogs() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DEDUP_LOGS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  logDedupEvent(event) {
    const logs = this.getDedupLogs();
    logs.unshift(event);
    if (logs.length > 50) logs.pop(); // keep last 50
    localStorage.setItem(STORAGE_KEYS.DEDUP_LOGS, JSON.stringify(logs));

    // Update Telemetry counters
    const stats = this.getTelemetryStats();
    stats.duplicatesSuppressed += 1;
    stats.bytesConserved += 184; // avg SOS packet size: 184 bytes saved
    this.saveTelemetryStats(stats);
  }

  getTelemetryStats() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TELEMETRY_STATS);
      return data ? JSON.parse(data) : {
        totalBroadcasts: 0,
        duplicatesSuppressed: 0,
        bytesConserved: 0,
        packetsDelivered: 0,
        meshHopsTotal: 0
      };
    } catch (e) {
      return { totalBroadcasts: 0, duplicatesSuppressed: 0, bytesConserved: 0, packetsDelivered: 0, meshHopsTotal: 0 };
    }
  }

  saveTelemetryStats(stats) {
    try {
      localStorage.setItem(STORAGE_KEYS.TELEMETRY_STATS, JSON.stringify(stats));
    } catch (e) {
      console.error(e);
    }
  }

  // Clear or Reset
  clearAll() {
    localStorage.removeItem(STORAGE_KEYS.INCIDENTS);
    localStorage.removeItem(STORAGE_KEYS.OUTBOX_QUEUE);
    localStorage.removeItem(STORAGE_KEYS.DEDUP_LOGS);
    this.initDefaultStorage();
  }

  // Export Data for External Command & GIS
  exportAsJSON() {
    const data = {
      exportedAt: new Date().toISOString(),
      system: 'OFFGRID-RESQ DISASTER ENGINE v1.0',
      incidents: this.getIncidents(),
      telemetry: this.getTelemetryStats()
    };
    return JSON.stringify(data, null, 2);
  }

  exportAsGeoJSON() {
    const incidents = this.getIncidents();
    const features = incidents.map(inc => {
      const coords = inc.location && inc.location.coordinates 
        ? [inc.location.coordinates.lng, inc.location.coordinates.lat]
        : [0, 0];
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: coords
        },
        properties: {
          id: inc.id,
          priority: inc.priority,
          emergencyType: inc.emergencyType,
          peopleAffected: inc.peopleAffected,
          injurySeverity: inc.injurySeverity,
          status: inc.status,
          timestamp: inc.timestamp
        }
      };
    });

    return JSON.stringify({
      type: 'FeatureCollection',
      features: features
    }, null, 2);
  }
}

// Export singleton instance
window.resqStorage = new ResqStorage();
