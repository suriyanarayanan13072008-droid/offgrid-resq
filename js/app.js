/**
 * OFFGRID-RESQ – MAIN APPLICATION CONTROLLER
 * Coordinates UI views, event listeners, form submissions,
 * real-time telemetry, map rendering, and audio alerts.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Core Application
  App.init();
});

const App = {
  activeView: 'citizen-sos',
  tacticalMap: null,
  isResponderAuthorized: false,
  currentUserCoords: null,

  init() {
    this.initNavigation();
    this.initNetworkStatus();
    this.initCitizenSosForm();
    this.initDashboard();
    this.initSheltersView();
    this.initDiagnosticsView();
    this.initAudioAndStrobe();
    this.initModals();

    // Seed default disaster scenario if storage is empty
    if (window.resqStorage.getIncidents().length === 0) {
      const sample = window.resqMesh.generateDisasterScenario();
      window.resqStorage.saveIncidents(sample);
    }

    // Initialize Tactical Canvas Map
    setTimeout(() => {
      this.tacticalMap = new window.TacticalDisasterMap('tacticalDisasterCanvas');
      this.renderDashboardIncidents();
      this.updateDashboardMetrics();
    }, 100);

    // Initial Live Triage preview calculation
    this.updateLiveTriagePreview();
  },

  /* ==========================================================================
     NAVIGATION & TABS
     ========================================================================== */
  initNavigation() {
    const tabButtons = document.querySelectorAll('.nav-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.dataset.view;
        this.switchView(targetView);
      });
    });

    // Quick Trigger buttons
    const quickSosBtn = document.getElementById('quickSosNavBtn');
    if (quickSosBtn) {
      quickSosBtn.addEventListener('click', () => this.switchView('citizen-sos'));
    }
  },

  switchView(viewId) {
    this.activeView = viewId;

    // Update active nav button
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewId);
    });

    // Update active section
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.toggle('active', sec.id === `view-${viewId}`);
    });

    // If switching to dashboard, resize & redraw map
    if (viewId === 'rescue-dashboard' && this.tacticalMap) {
      setTimeout(() => {
        this.tacticalMap.setupResolution();
        this.tacticalMap.draw();
      }, 50);
      this.renderDashboardIncidents();
      this.updateDashboardMetrics();
    }

    if (viewId === 'offline-shelters') {
      this.renderSheltersList();
    }

    if (viewId === 'testing-diagnostics') {
      this.updateDiagnosticsUI();
    }
  },

  /* ==========================================================================
     NETWORK GRID SIMULATION & STATUS
     ========================================================================== */
  initNetworkStatus() {
    const gridToggle = document.getElementById('gridFailureToggle');
    const networkBadge = document.getElementById('networkStatusBadge');
    const outboxBadge = document.getElementById('outboxStatusPill');

    const updateNetworkDisplay = () => {
      const isOffline = window.resqStorage.isOfflineMode();
      if (networkBadge) {
        if (isOffline) {
          networkBadge.className = 'network-badge offline-mesh';
          networkBadge.innerHTML = '● GRID DOWN: OFFLINE MESH ACTIVE';
        } else {
          networkBadge.className = 'network-badge online';
          networkBadge.innerHTML = '● GRID ONLINE (CELLULAR/WIFI)';
        }
      }

      // Update outbox count
      const outbox = window.resqStorage.getOutboxQueue();
      if (outboxBadge) {
        if (outbox.length > 0) {
          outboxBadge.style.display = 'inline-flex';
          outboxBadge.textContent = `⚡ Outbox: ${outbox.length} pending`;
        } else {
          outboxBadge.style.display = 'none';
        }
      }
    };

    // Browser online/offline event listeners
    window.addEventListener('online', () => {
      this.showToast('Browser restored Internet connection', 'success');
      updateNetworkDisplay();
    });

    window.addEventListener('offline', () => {
      this.showToast('Browser went offline. Automatic Mesh & LocalStorage mode enabled.', 'warning');
      updateNetworkDisplay();
    });

    // Manual Grid Failure Simulation Switch
    if (gridToggle) {
      gridToggle.addEventListener('change', (e) => {
        window.resqStorage.setSimulatedOffline(e.target.checked);
        updateNetworkDisplay();
        if (e.target.checked) {
          this.showToast('Simulated Grid Failure Activated! Operating in pure offline RF Mesh mode.', 'warning');
          this.logTerminalLine('SYSTEM: Simulated Grid Collapse. Disconnected from cloud uplinks. Switching to LoRa/BLE mesh broadcast.');
        } else {
          this.showToast('Simulated Grid Restored. Standard cloud gateway active.', 'success');
          this.logTerminalLine('SYSTEM: Cellular infrastructure restored. Gateway relay synchronized.');
        }
      });
    }

    updateNetworkDisplay();
  },

  /* ==========================================================================
     VIEW 1: CITIZEN SOS MODULE
     ========================================================================== */
  initCitizenSosForm() {
    const form = document.getElementById('citizenSosForm');
    const gpsBtn = document.getElementById('autoGpsBtn');
    const gpsReadout = document.getElementById('gpsReadoutText');
    const peopleStepperDec = document.getElementById('peopleDec');
    const peopleStepperInc = document.getElementById('peopleInc');
    const peopleCountVal = document.getElementById('peopleCountVal');

    // Stepper buttons
    if (peopleStepperDec && peopleStepperInc && peopleCountVal) {
      peopleStepperDec.addEventListener('click', () => {
        let val = parseInt(peopleCountVal.textContent, 10);
        if (val > 1) {
          peopleCountVal.textContent = val - 1;
          this.updateLiveTriagePreview();
        }
      });
      peopleStepperInc.addEventListener('click', () => {
        let val = parseInt(peopleCountVal.textContent, 10);
        if (val < 100) {
          peopleCountVal.textContent = val + 1;
          this.updateLiveTriagePreview();
        }
      });
    }

    // HTML5 Geolocation API (Real In-Browser Capability)
    if (gpsBtn) {
      gpsBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
          this.showToast('Geolocation API is not supported by your browser.', 'warning');
          return;
        }

        gpsReadout.textContent = 'Acquiring satellite lock...';
        gpsBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const acc = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : 10;
            this.currentUserCoords = { lat, lng, accuracy: acc };

            gpsReadout.textContent = `LAT: ${lat.toFixed(5)}° | LNG: ${lng.toFixed(5)}° | ACCURACY: ±${acc}m`;
            gpsReadout.style.color = '#00e676';
            gpsBtn.disabled = false;
            this.showToast('GPS Lock Acquired (Real Browser Geolocation)', 'success');

            // Also auto-fill address if empty
            const locationInput = document.getElementById('locationTextInput');
            if (locationInput && !locationInput.value) {
              locationInput.value = `GPS Fix [${lat.toFixed(4)}, ${lng.toFixed(4)}]`;
            }

            // Recalculate shelters distance
            this.renderSheltersList();
          },
          (err) => {
            console.warn('Geolocation error:', err.message);
            // Graceful fallback to simulated coordinates in disaster zone
            const simLat = 13.0815 + (Math.random() - 0.5) * 0.015;
            const simLng = 80.2710 + (Math.random() - 0.5) * 0.015;
            this.currentUserCoords = { lat: simLat, lng: simLng, accuracy: 25 };
            gpsReadout.textContent = `SIMULATED FIX: ${simLat.toFixed(5)}°N, ${simLng.toFixed(5)}°E (Fallback)`;
            gpsReadout.style.color = '#ff9100';
            gpsBtn.disabled = false;
            this.showToast('Using Simulated Disaster Zone Coordinates (Fallback)', 'warning');
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });
    }

    // Listen to changes for Live Triage Preview
    if (form) {
      form.addEventListener('change', () => this.updateLiveTriagePreview());
      form.addEventListener('input', () => this.updateLiveTriagePreview());

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSosSubmission();
      });
    }

    // Sync outbox button
    const syncOutboxBtn = document.getElementById('syncOutboxBtn');
    if (syncOutboxBtn) {
      syncOutboxBtn.addEventListener('click', () => this.syncOfflineOutbox());
    }
  },

  /**
   * Calculates live triage score in real-time as user fills out the form.
   */
  updateLiveTriagePreview() {
    const formData = this.getFormData();
    const triage = window.resqTriage.classify(formData);

    const scoreCircle = document.getElementById('triageScoreCircle');
    const scoreVal = document.getElementById('triageScoreVal');
    const triageLevelTitle = document.getElementById('triageLevelTitle');
    const triageRationaleText = document.getElementById('triageRationaleText');
    const previewCard = document.getElementById('triagePreviewCard');

    if (scoreVal) scoreVal.textContent = triage.score;

    if (previewCard && scoreCircle && triageLevelTitle && triageRationaleText) {
      previewCard.className = `triage-preview-card ${triage.priority.toLowerCase()}`;
      scoreCircle.className = `triage-score-circle ${triage.priority.toLowerCase()}`;

      triageLevelTitle.innerHTML = `Priority: <strong>${triage.priority}</strong> (AI Triage Score: ${triage.score}/100)`;
      triageRationaleText.textContent = triage.rationale.length > 0 
        ? triage.rationale.join(' • ')
        : 'Standard priority baseline triage score.';
    }
  },

  getFormData() {
    const emergencyTypeEl = document.querySelector('input[name="emergencyType"]:checked');
    const injurySevEl = document.querySelector('input[name="injurySeverity"]:checked');
    const locationInput = document.getElementById('locationTextInput');
    const detailsInput = document.getElementById('emergencyDetailsInput');
    const citizenNameInput = document.getElementById('citizenNameInput');
    const citizenContactInput = document.getElementById('citizenContactInput');
    const maskPrivacyEl = document.getElementById('maskPrivacyCheckbox');
    const peopleCountEl = document.getElementById('peopleCountVal');

    const hazards = [];
    document.querySelectorAll('input[name="hazards"]:checked').forEach(cb => hazards.push(cb.value));

    const vulnerabilities = [];
    document.querySelectorAll('input[name="vulnerabilities"]:checked').forEach(cb => vulnerabilities.push(cb.value));

    return {
      emergencyType: emergencyTypeEl ? emergencyTypeEl.value : 'flood',
      injurySeverity: injurySevEl ? injurySevEl.value : 'severe',
      peopleAffected: peopleCountEl ? parseInt(peopleCountEl.textContent, 10) : 1,
      locationText: locationInput ? locationInput.value.trim() : '',
      coords: this.currentUserCoords || { lat: 13.0805, lng: 80.2720 },
      details: detailsInput ? detailsInput.value.trim() : '',
      hazards: hazards,
      vulnerabilities: vulnerabilities,
      citizen: {
        name: citizenNameInput ? citizenNameInput.value.trim() : 'Anonymous',
        contact: citizenContactInput ? citizenContactInput.value.trim() : 'N/A'
      },
      maskPrivacy: maskPrivacyEl ? maskPrivacyEl.checked : true,
      telemetry: {
        batteryLevel: 45, // simulated battery %
        meshHops: 2
      }
    };
  },

  /**
   * Handles Citizen SOS Form Submission
   */
  async handleSosSubmission() {
    const rawData = this.getFormData();

    // 1. Validate Form Data
    const validation = window.resqSecurity.validateSosSubmission(rawData);
    if (!validation.isValid) {
      this.showToast(validation.errors[0], 'critical');
      return;
    }

    // 2. Sanitize Text Inputs
    const sanitizedDetails = window.resqSecurity.sanitizeText(rawData.details);
    const sanitizedLocation = window.resqSecurity.sanitizeText(rawData.locationText);
    const sanitizedName = window.resqSecurity.sanitizeText(rawData.citizen.name);
    const sanitizedContact = window.resqSecurity.sanitizeText(rawData.citizen.contact);

    // 3. Compute AI Triage Classification
    const triage = window.resqTriage.classify(rawData);

    // 4. Generate Incident ID and Deduplication Fingerprint
    const incidentId = window.resqSecurity.generateIncidentId();
    const fingerprint = window.resqSecurity.generateFingerprint({
      emergencyType: rawData.emergencyType,
      location: { coordinates: rawData.coords, gridRef: sanitizedLocation },
      citizen: { name: sanitizedName, contact: sanitizedContact }
    });

    const isOffline = window.resqStorage.isOfflineMode();

    const incidentRecord = {
      id: incidentId,
      timestamp: new Date().toISOString(),
      emergencyType: rawData.emergencyType,
      injurySeverity: rawData.injurySeverity,
      peopleAffected: rawData.peopleAffected,
      hazards: rawData.hazards,
      vulnerabilities: rawData.vulnerabilities,
      location: {
        addressText: sanitizedLocation,
        coordinates: rawData.coords
      },
      details: sanitizedDetails || 'Immediate assistance requested.',
      citizen: {
        name: sanitizedName,
        contact: sanitizedContact
      },
      maskPrivacy: rawData.maskPrivacy,
      priority: triage.priority,
      triage: triage,
      fingerprint: fingerprint,
      status: 'pending',
      broadcastCount: 1,
      networkMode: isOffline ? 'OFFLINE_MESH_STORE' : 'ONLINE_DIRECT',
      integrityTag: window.resqSecurity.generateIntegrityTag(incidentId, sanitizedLocation)
    };

    // 5. Check for Duplicate Suppression
    const existingIncidents = window.resqStorage.getIncidents();
    const dedupCheck = window.resqSecurity.checkDuplicate(incidentRecord, existingIncidents);

    if (dedupCheck.isDuplicate) {
      // DUPLICATE DETECTED: Suppress creating a duplicate ticket!
      const target = dedupCheck.targetIncident;
      target.broadcastCount = (target.broadcastCount || 1) + 1;
      target.lastBroadcastReceived = new Date().toISOString();
      window.resqStorage.updateIncident(target.id, {
        broadcastCount: target.broadcastCount,
        lastBroadcastReceived: target.lastBroadcastReceived
      });

      // Log deduplication event
      window.resqStorage.logDedupEvent({
        timestamp: new Date().toISOString(),
        incidentId: target.id,
        reason: dedupCheck.reason,
        suppressedPacketNumber: target.broadcastCount,
        bandwidthSavedBytes: 184
      });

      this.showToast(`Duplicate SOS Suppressed! Merged into Incident #${target.id} (Broadcast #${target.broadcastCount})`, 'warning');
      this.logTerminalLine(`DEDUP ENGINE: Duplicate packet suppressed for #${target.id}. Saved 184 bytes bandwidth.`);
      window.resqAudio.playEmergencyAlertSound();

      // Show receipt view for existing incident
      this.displaySosReceipt(target, true);
      this.renderDashboardIncidents();
      this.updateDashboardMetrics();
      return;
    }

    // 6. Handle New Incident
    const transmitBtn = document.getElementById('sosTransmitBtn');
    if (transmitBtn) {
      transmitBtn.disabled = true;
      transmitBtn.textContent = 'TRANSMITTING OVER MESH...';
    }

    // Visual transmission timeline animation
    this.showTransmissionProgressModal(incidentRecord);

    const meshPacket = window.resqMesh.encodeSosPacket(incidentRecord);

    if (isOffline) {
      // Save locally to outbox queue & persistent store
      window.resqStorage.addToOutbox(meshPacket);
      window.resqStorage.addIncident(incidentRecord);
      this.logTerminalLine(`OFFLINE STORAGE: SOS #${incidentRecord.id} committed to browser LocalStorage flash outbox.`);
    } else {
      window.resqStorage.addIncident(incidentRecord);
      this.logTerminalLine(`DIRECT UPLINK: SOS #${incidentRecord.id} transmitted to Rescue Command.`);
    }

    // Play tone
    if (incidentRecord.priority === 'CRITICAL') {
      window.resqAudio.playEmergencyAlertSound();
    } else {
      window.resqAudio.playAcknowledgeSound();
    }

    // Simulate multi-hop mesh broadcast
    await window.resqMesh.simulateMeshBroadcast(meshPacket, (progress) => {
      this.updateTransmissionModalStep(progress);
    });

    if (transmitBtn) {
      transmitBtn.disabled = false;
      transmitBtn.innerHTML = '⚡ TRANSMIT EMERGENCY SOS [OFFLINE BROADCAST]';
    }

    // Show persistent receipt sidebar
    this.displaySosReceipt(incidentRecord, false);

    // Update Dashboard & Map
    this.renderDashboardIncidents();
    this.updateDashboardMetrics();
    if (this.tacticalMap) {
      this.tacticalMap.draw();
    }

    this.showToast(`SOS Beacon Successfully Broadcast! Incident ID: ${incidentRecord.id}`, 'success');
  },

  displaySosReceipt(incident, isDuplicate = false) {
    const receiptBox = document.getElementById('sosReceiptCard');
    if (!receiptBox) return;

    receiptBox.style.display = 'block';
    receiptBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    document.getElementById('receiptIncidentId').textContent = incident.id;
    document.getElementById('receiptPriorityBadge').textContent = incident.priority;
    document.getElementById('receiptPriorityBadge').className = `priority-tag ${incident.priority.toLowerCase()}`;
    document.getElementById('receiptBroadcastCount').textContent = `Broadcasts: ${incident.broadcastCount || 1}`;
    document.getElementById('receiptTimestamp').textContent = new Date(incident.timestamp).toLocaleTimeString();
    document.getElementById('receiptStatusText').textContent = incident.status.toUpperCase();

    // Show safety guidance recommendation tailored to the disaster
    const guidanceEl = document.getElementById('receiptDisasterGuidance');
    if (guidanceEl && window.resqShelters) {
      const pb = window.resqShelters.playbooks.find(p => p.id.includes(incident.emergencyType)) || window.resqShelters.playbooks[0];
      guidanceEl.innerHTML = `
        <div style="margin-top:10px; padding:10px; background:rgba(0,229,255,0.08); border-radius:6px; border:1px solid rgba(0,229,255,0.25)">
          <div style="font-weight:700; color:#00e5ff; font-size:0.8rem; margin-bottom:4px;">🚨 Immediate Safety Action (${pb.title}):</div>
          <p style="font-size:0.75rem; color:#d0e2fb;">${pb.steps[0]}</p>
        </div>
      `;
    }
  },

  showTransmissionProgressModal(incident) {
    const modal = document.getElementById('transmissionModal');
    if (modal) modal.classList.add('active');

    document.getElementById('txModalIncidentId').textContent = incident.id;
    document.getElementById('txModalPriority').textContent = incident.priority;

    // Reset step UI
    for (let i = 1; i <= 4; i++) {
      const stepEl = document.getElementById(`txStep${i}`);
      if (stepEl) stepEl.className = 'timeline-step';
    }
    const step1 = document.getElementById('txStep1');
    if (step1) step1.className = 'timeline-step active';
  },

  updateTransmissionModalStep(progress) {
    const stepNum = progress.step;
    for (let i = 1; i < stepNum; i++) {
      const stepEl = document.getElementById(`txStep${i}`);
      if (stepEl) stepEl.className = 'timeline-step completed';
    }
    const currentStep = document.getElementById(`txStep${stepNum}`);
    if (currentStep) {
      currentStep.className = 'timeline-step active';
      const detailP = currentStep.querySelector('p');
      if (detailP) detailP.textContent = `${progress.status} (Latency: ${progress.latencyMs}ms)`;
    }
  },

  /* ==========================================================================
     VIEW 2: RESCUE COMMAND DASHBOARD
     ========================================================================== */
  initDashboard() {
    const priorityFilter = document.getElementById('filterPriority');
    const statusFilter = document.getElementById('filterStatus');
    const searchInput = document.getElementById('dashboardSearchInput');
    const scenarioBtn = document.getElementById('loadScenarioBtn');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const exportGeoJsonBtn = document.getElementById('exportGeoJsonBtn');
    const purgeResolvedBtn = document.getElementById('purgeResolvedBtn');
    const responderAuthBtn = document.getElementById('responderAuthBtn');

    if (priorityFilter) priorityFilter.addEventListener('change', () => this.renderDashboardIncidents());
    if (statusFilter) statusFilter.addEventListener('change', () => this.renderDashboardIncidents());
    if (searchInput) searchInput.addEventListener('input', () => this.renderDashboardIncidents());

    if (scenarioBtn) {
      scenarioBtn.addEventListener('click', () => {
        const scenario = window.resqMesh.generateDisasterScenario();
        window.resqStorage.saveIncidents(scenario);
        this.renderDashboardIncidents();
        this.updateDashboardMetrics();
        if (this.tacticalMap) {
          this.tacticalMap.resetView();
          this.tacticalMap.draw();
        }
        this.showToast('Simulated Multi-Disaster Scenario Injected!', 'success');
        this.logTerminalLine('SYSTEM: Injected 6 simulated disaster incidents across Sector 4.');
      });
    }

    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', () => {
        const json = window.resqStorage.exportAsJSON();
        this.downloadFile('offgrid-resq-incidents.json', json, 'application/json');
        this.showToast('Exported incidents as JSON', 'success');
      });
    }

    if (exportGeoJsonBtn) {
      exportGeoJsonBtn.addEventListener('click', () => {
        const geojson = window.resqStorage.exportAsGeoJSON();
        this.downloadFile('offgrid-resq-gis.geojson', geojson, 'application/geo+json');
        this.showToast('Exported incidents as GeoJSON for GIS mapping', 'success');
      });
    }

    if (purgeResolvedBtn) {
      purgeResolvedBtn.addEventListener('click', () => {
        const incidents = window.resqStorage.getIncidents();
        const activeOnly = incidents.filter(i => i.status !== 'evacuated' && i.status !== 'resolved');
        window.resqStorage.saveIncidents(activeOnly);
        this.renderDashboardIncidents();
        this.updateDashboardMetrics();
        if (this.tacticalMap) this.tacticalMap.draw();
        this.showToast('Purged evacuated/resolved incidents from active queue', 'warning');
      });
    }

    if (responderAuthBtn) {
      responderAuthBtn.addEventListener('click', () => {
        this.openPinAuthModal();
      });
    }

    // Map control buttons
    const zoomInBtn = document.getElementById('mapZoomInBtn');
    const zoomOutBtn = document.getElementById('mapZoomOutBtn');
    const resetMapBtn = document.getElementById('mapResetBtn');

    if (zoomInBtn) zoomInBtn.addEventListener('click', () => { if (this.tacticalMap) this.tacticalMap.zoomIn(); });
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => { if (this.tacticalMap) this.tacticalMap.zoomOut(); });
    if (resetMapBtn) resetMapBtn.addEventListener('click', () => { if (this.tacticalMap) this.tacticalMap.resetView(); });
  },

  renderDashboardIncidents() {
    const listEl = document.getElementById('incidentFeedList');
    if (!listEl) return;

    let incidents = window.resqStorage.getIncidents();

    // Filters
    const priority = document.getElementById('filterPriority')?.value || 'ALL';
    const status = document.getElementById('filterStatus')?.value || 'ALL';
    const search = (document.getElementById('dashboardSearchInput')?.value || '').toLowerCase();

    if (priority !== 'ALL') {
      incidents = incidents.filter(i => i.priority === priority);
    }
    if (status !== 'ALL') {
      incidents = incidents.filter(i => i.status === status);
    }
    if (search) {
      incidents = incidents.filter(i => 
        i.id.toLowerCase().includes(search) ||
        (i.location.addressText || '').toLowerCase().includes(search) ||
        (i.details || '').toLowerCase().includes(search) ||
        (i.citizen && (i.citizen.name || '').toLowerCase().includes(search))
      );
    }

    if (incidents.length === 0) {
      listEl.innerHTML = `
        <div style="text-align:center; padding: 40px; color: var(--text-dim); background: rgba(0,0,0,0.2); border-radius: 8px;">
          <div style="font-size: 2rem; margin-bottom: 8px;">📡</div>
          <div style="font-weight: 600;">No SOS incidents found matching active filters.</div>
          <div style="font-size: 0.8rem; margin-top: 4px;">Click "Load Disaster Scenario" or submit an SOS to populate.</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = incidents.map(inc => {
      // PII masking check
      const citizenInfo = window.resqSecurity.maskPII(inc.citizen, this.isResponderAuthorized);
      const timeAgo = this.formatTimeAgo(inc.timestamp);
      const isCritical = inc.priority === 'CRITICAL';
      const duplicateCount = inc.broadcastCount || 1;

      return `
        <div class="incident-card ${inc.priority.toLowerCase()}" data-id="${inc.id}">
          <div class="incident-card-top">
            <div class="incident-id-badge">
              <span>🚨</span>
              <span>${inc.id}</span>
              ${duplicateCount > 1 ? `<span class="dedup-badge">x${duplicateCount} broadcasts</span>` : ''}
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="priority-tag ${inc.priority.toLowerCase()}">${inc.priority} (Score: ${inc.triage ? inc.triage.score : 50})</span>
              <span style="font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono);">${timeAgo}</span>
            </div>
          </div>

          <div class="incident-card-body">
            <div class="incident-headline">
              <span>${this.getDisasterIcon(inc.emergencyType)}</span>
              <span>${this.capitalize(inc.emergencyType)} Emergency – ${inc.peopleAffected} Person(s) Affected</span>
            </div>

            <div class="incident-meta-row">
              <span>📍 ${inc.location.addressText || 'Grid Coordinates'}</span>
              <span>🩸 Severity: <strong style="color:#ff8a80">${this.capitalize(inc.injurySeverity.replace('_', ' '))}</strong></span>
              <span>👤 ${citizenInfo.name} (${citizenInfo.contact})</span>
            </div>

            <div class="incident-detail-text">
              "${inc.details}"
            </div>

            ${inc.dispatchedUnit ? `
              <div style="margin-top:6px; font-size:0.75rem; color:var(--high-orange); font-weight:600;">
                🚁 Assigned Unit: ${inc.dispatchedUnit}
              </div>
            ` : ''}
          </div>

          <div class="incident-card-footer">
            <span class="status-badge ${inc.status}">${inc.status.toUpperCase()}</span>

            <div class="card-btn-group">
              <button class="btn-sm" onclick="App.showOnMap('${inc.id}')">🗺️ Map</button>
              <button class="btn-sm" onclick="App.openTriageModal('${inc.id}')">ℹ️ Triage Rationale</button>

              ${inc.status === 'pending' ? `
                <button class="btn-sm btn-ack" onclick="App.acknowledgeIncident('${inc.id}')">✔ Acknowledge</button>
                <button class="btn-sm" style="background:rgba(255,145,0,0.2); border-color:var(--high-orange); color:var(--high-orange);" onclick="App.openDispatchModal('${inc.id}')">🚁 Dispatch Unit</button>
              ` : ''}

              ${inc.status === 'acknowledged' ? `
                <button class="btn-sm" style="background:rgba(255,145,0,0.2); border-color:var(--high-orange); color:var(--high-orange);" onclick="App.openDispatchModal('${inc.id}')">🚁 Dispatch Unit</button>
              ` : ''}

              ${inc.status === 'dispatched' ? `
                <button class="btn-sm" style="background:rgba(0,230,118,0.2); border-color:var(--safe-green); color:var(--safe-green);" onclick="App.markEvacuated('${inc.id}')">🏁 Mark Evacuated</button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  updateDashboardMetrics() {
    const incidents = window.resqStorage.getIncidents();
    const stats = window.resqStorage.getTelemetryStats();

    const totalCount = incidents.length;
    const criticalCount = incidents.filter(i => i.priority === 'CRITICAL' && i.status !== 'evacuated').length;
    const dispatchedCount = incidents.filter(i => i.status === 'dispatched').length;
    const evacuatedCount = incidents.filter(i => i.status === 'evacuated' || i.status === 'resolved').length;

    // Sum of duplicates suppressed
    let totalDuplicatesSuppressed = stats.duplicatesSuppressed || 0;
    incidents.forEach(i => {
      if (i.broadcastCount && i.broadcastCount > 1) {
        totalDuplicatesSuppressed += (i.broadcastCount - 1);
      }
    });

    const elTotal = document.getElementById('kpiTotalSos');
    const elCritical = document.getElementById('kpiCriticalCount');
    const elDispatched = document.getElementById('kpiDispatchedCount');
    const elEvacuated = document.getElementById('kpiEvacuatedCount');
    const elDedup = document.getElementById('kpiDedupCount');

    if (elTotal) elTotal.textContent = totalCount;
    if (elCritical) elCritical.textContent = criticalCount;
    if (elDispatched) elDispatched.textContent = dispatchedCount;
    if (elEvacuated) elEvacuated.textContent = evacuatedCount;
    if (elDedup) elDedup.textContent = totalDuplicatesSuppressed;

    // Update Nav Badge count
    const navCriticalBadge = document.getElementById('navCriticalBadge');
    if (navCriticalBadge) {
      navCriticalBadge.textContent = criticalCount;
      navCriticalBadge.style.display = criticalCount > 0 ? 'inline-block' : 'none';
    }
  },

  showOnMap(incidentId) {
    const inc = window.resqStorage.getIncidentById(incidentId);
    if (!inc || !inc.location.coordinates) return;

    if (this.tacticalMap) {
      this.tacticalMap.focusIncident(inc.location.coordinates.lat, inc.location.coordinates.lng, inc.id);
      this.tacticalMap.draw();
      this.showToast(`Centered Tactical Canvas on Incident #${inc.id}`, 'info');
    }
  },

  acknowledgeIncident(incidentId) {
    window.resqStorage.updateIncident(incidentId, {
      status: 'acknowledged',
      acknowledgedAt: new Date().toISOString()
    });
    window.resqAudio.playAcknowledgeSound();
    this.showToast(`Incident #${incidentId} marked ACKNOWLEDGED. Mesh confirmation beacon relayed.`, 'success');
    this.logTerminalLine(`RESCUE HQ: Transmitted ACK packet to Incident #${incidentId}.`);
    this.renderDashboardIncidents();
    this.updateDashboardMetrics();
    if (this.tacticalMap) this.tacticalMap.draw();
  },

  openDispatchModal(incidentId) {
    const modal = document.getElementById('dispatchModal');
    if (!modal) return;
    document.getElementById('dispatchIncidentId').textContent = incidentId;
    modal.classList.add('active');
  },

  confirmDispatchUnit() {
    const incidentId = document.getElementById('dispatchIncidentId').textContent;
    const unitSelect = document.getElementById('dispatchUnitSelect');
    const unitName = unitSelect ? unitSelect.value : 'SAR Field Team 1';

    window.resqStorage.updateIncident(incidentId, {
      status: 'dispatched',
      dispatchedUnit: unitName,
      dispatchedAt: new Date().toISOString()
    });

    document.getElementById('dispatchModal').classList.remove('active');
    this.showToast(`Dispatched unit [${unitName}] to Incident #${incidentId}!`, 'success');
    this.logTerminalLine(`DISPATCH: Team ${unitName} deployed to Incident #${incidentId}.`);
    window.resqAudio.playEmergencyAlertSound();
    this.renderDashboardIncidents();
    this.updateDashboardMetrics();
    if (this.tacticalMap) this.tacticalMap.draw();
  },

  markEvacuated(incidentId) {
    window.resqStorage.updateIncident(incidentId, {
      status: 'evacuated',
      evacuatedAt: new Date().toISOString()
    });
    this.showToast(`Incident #${incidentId} recorded as EVACUATED / RESOLVED.`, 'success');
    this.logTerminalLine(`SAR REPORT: All souls evacuated safely for Incident #${incidentId}.`);
    this.renderDashboardIncidents();
    this.updateDashboardMetrics();
    if (this.tacticalMap) this.tacticalMap.draw();
  },

  openTriageModal(incidentId) {
    const inc = window.resqStorage.getIncidentById(incidentId);
    if (!inc) return;

    const modal = document.getElementById('triageModal');
    if (!modal) return;

    document.getElementById('triageModalId').textContent = inc.id;
    document.getElementById('triageModalScore').textContent = `${inc.triage ? inc.triage.score : 50}/100`;
    document.getElementById('triageModalPriority').textContent = inc.priority;
    document.getElementById('triageModalPriority').className = `priority-tag ${inc.priority.toLowerCase()}`;

    const rationaleList = document.getElementById('triageModalRationaleList');
    if (rationaleList) {
      if (inc.triage && inc.triage.rationale && inc.triage.rationale.length > 0) {
        rationaleList.innerHTML = inc.triage.rationale.map(r => `
          <li style="margin-bottom:6px; color:#c0d1ea;">✔ ${r}</li>
        `).join('');
      } else {
        rationaleList.innerHTML = `<li>Baseline emergency score applied.</li>`;
      }
    }

    modal.classList.add('active');
  },

  /* ==========================================================================
     VIEW 3: EVACUATION GUIDANCE & SHELTERS
     ========================================================================== */
  initSheltersView() {
    this.renderSheltersList();
  },

  renderSheltersList() {
    const listEl = document.getElementById('sheltersGridList');
    if (!listEl || !window.resqShelters) return;

    const userLat = this.currentUserCoords ? this.currentUserCoords.lat : 13.0800;
    const userLng = this.currentUserCoords ? this.currentUserCoords.lng : 80.2700;

    const shelters = window.resqShelters.getSheltersWithDistances(userLat, userLng);

    listEl.innerHTML = shelters.map(s => {
      const pct = Math.round((s.currentOccupancy / s.capacity) * 100);
      let pctClass = '';
      if (pct > 85) pctClass = 'full';
      else if (pct > 60) pctClass = 'high';

      const distStr = s.distanceKm !== null ? `${s.distanceKm} km away` : 'Distance pending GPS';

      return `
        <div class="shelter-card">
          <div class="shelter-header">
            <div>
              <div class="shelter-title">${s.name}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${s.type} • Elev: +${s.elevationMeters}m</div>
            </div>
            <span class="shelter-distance">${distStr}</span>
          </div>

          <div style="font-size:0.8rem; color:#a2b7d4; margin-bottom:8px;">📍 ${s.address}</div>

          <div class="occupancy-bar-wrapper">
            <div class="occupancy-label-row">
              <span>Occupancy: <strong>${s.currentOccupancy} / ${s.capacity}</strong></span>
              <span><strong>${pct}%</strong> capacity</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${pctClass}" style="width: ${pct}%"></div>
            </div>
          </div>

          <div class="shelter-amenities">
            ${s.amenities.map(a => `<span class="amenity-tag">✓ ${a}</span>`).join('')}
          </div>

          <div style="font-size:0.74rem; color:#ffd54f; background:rgba(255,213,79,0.08); padding:8px; border-radius:4px; border-left:2px solid #ffd54f; margin-top:10px;">
            <strong>Evacuation Route:</strong> ${s.evacRoute}
          </div>

          <div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.72rem; font-family:var(--font-mono); color:var(--text-muted);">📻 ${s.contactFreq}</span>
            <button class="btn-sm" onclick="App.showShelterOnMap(${s.coordinates.lat}, ${s.coordinates.lng})">🗺️ View Map</button>
          </div>
        </div>
      `;
    }).join('');
  },

  showShelterOnMap(lat, lng) {
    this.switchView('rescue-dashboard');
    setTimeout(() => {
      if (this.tacticalMap) {
        this.tacticalMap.focusIncident(lat, lng);
        this.tacticalMap.draw();
      }
    }, 150);
  },

  /* ==========================================================================
     VIEW 4: TESTING & DIAGNOSTICS LAB
     ========================================================================== */
  initDiagnosticsView() {
    const burstTestBtn = document.getElementById('runBurstTestBtn');
    const batteryCalcSelect = document.getElementById('batteryHoursSelect');

    if (burstTestBtn) {
      burstTestBtn.addEventListener('click', () => this.runSimulatedBurstTest());
    }

    if (batteryCalcSelect) {
      batteryCalcSelect.addEventListener('change', (e) => {
        this.updateBatteryDiagnostics(parseInt(e.target.value, 10));
      });
    }

    this.updateDiagnosticsUI();
  },

  updateDiagnosticsUI() {
    this.updateBatteryDiagnostics(12);
    this.renderDedupLogsTable();

    // Update Telemetry stats
    const stats = window.resqStorage.getTelemetryStats();
    const elSavedBytes = document.getElementById('diagBytesSaved');
    if (elSavedBytes) {
      elSavedBytes.textContent = `${(stats.bytesConserved / 1024).toFixed(1)} KB`;
    }
  },

  updateBatteryDiagnostics(hours) {
    const batteryModel = window.resqMesh.estimateBatteryConsumption(hours);

    const cellPercentEl = document.getElementById('battCellularPercent');
    const cellDrainEl = document.getElementById('battCellularDrain');
    const offgridPercentEl = document.getElementById('battOffgridPercent');
    const offgridDrainEl = document.getElementById('battOffgridDrain');
    const gainEl = document.getElementById('battEfficiencyGain');

    if (cellPercentEl) cellPercentEl.textContent = `${batteryModel.cellular.percentUsed}% (${batteryModel.cellular.drainMah} mAh)`;
    if (cellDrainEl) cellDrainEl.style.width = `${batteryModel.cellular.percentUsed}%`;

    if (offgridPercentEl) offgridPercentEl.textContent = `${batteryModel.offgridResq.percentUsed}% (${batteryModel.offgridResq.drainMah} mAh)`;
    if (offgridDrainEl) offgridDrainEl.style.width = `${batteryModel.offgridResq.percentUsed}%`;

    if (gainEl) gainEl.textContent = batteryModel.efficiencyGain;
  },

  renderDedupLogsTable() {
    const tableBody = document.getElementById('dedupLogsTableBody');
    if (!tableBody) return;

    const logs = window.resqStorage.getDedupLogs();
    if (logs.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-dim); padding:16px;">No duplicate packets suppressed yet.</td></tr>`;
      return;
    }

    tableBody.innerHTML = logs.map(l => `
      <tr>
        <td style="font-family:var(--font-mono); color:#fff;">${new Date(l.timestamp).toLocaleTimeString()}</td>
        <td style="font-family:var(--font-mono); color:var(--cyan-telemetry);">${l.incidentId}</td>
        <td><span class="dedup-badge">Packet #${l.suppressedPacketNumber}</span></td>
        <td style="font-family:var(--font-mono); color:var(--safe-green);">+${l.bandwidthSavedBytes} Bytes</td>
      </tr>
    `).join('');
  },

  async runSimulatedBurstTest() {
    const btn = document.getElementById('runBurstTestBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'BURST INJECTION IN PROGRESS...';
    }

    this.showToast('Triggering Simulated 5-Packet Mesh Burst Test...', 'warning');
    this.logTerminalLine('DIAGNOSTICS: Starting 5-packet multi-path broadcast test.');

    // Inject 2 unique incidents and 3 deliberate duplicates of the same incident
    const testIncident = {
      id: 'BURST-TEST-' + Math.floor(Math.random() * 1000),
      emergencyType: 'collapse',
      injurySeverity: 'life_threatening',
      peopleAffected: 3,
      location: {
        addressText: 'Seismic Test Zone Alpha',
        coordinates: { lat: 13.0820, lng: 80.2650 }
      },
      citizen: { name: 'Test Responder', contact: '+1 (555) 000-1122' },
      details: 'Burst stress test payload.'
    };

    const triage = window.resqTriage.classify(testIncident);
    testIncident.triage = triage;
    testIncident.priority = triage.priority;
    testIncident.fingerprint = window.resqSecurity.generateFingerprint(testIncident);

    // Broadcast 1: First packet creates incident
    window.resqStorage.addIncident(testIncident);
    this.logTerminalLine(`TX #1: Packet ${testIncident.id} delivered. Registered new incident.`);

    // Broadcast 2, 3, 4: Deliberate duplicates
    for (let i = 2; i <= 5; i++) {
      await window.resqMesh.delay(300);
      const existing = window.resqStorage.getIncidents();
      const check = window.resqSecurity.checkDuplicate(testIncident, existing);

      if (check.isDuplicate) {
        check.targetIncident.broadcastCount = (check.targetIncident.broadcastCount || 1) + 1;
        window.resqStorage.updateIncident(check.targetIncident.id, {
          broadcastCount: check.targetIncident.broadcastCount
        });
        window.resqStorage.logDedupEvent({
          timestamp: new Date().toISOString(),
          incidentId: check.targetIncident.id,
          reason: check.reason,
          suppressedPacketNumber: check.targetIncident.broadcastCount,
          bandwidthSavedBytes: 184
        });
        this.logTerminalLine(`TX #${i}: Duplicate packet suppressed for ${testIncident.id}. Dedup saved 184 bytes.`);
      }
    }

    if (btn) {
      btn.disabled = false;
      btn.textContent = '🚀 RUN 5-PACKET BURST STRESS TEST';
    }

    this.showToast('Burst test completed! 4 duplicates suppressed.', 'success');
    this.updateDiagnosticsUI();
    this.renderDashboardIncidents();
    this.updateDashboardMetrics();
  },

  /* ==========================================================================
     AUDIO, STROBE & HARDWARE HOOKS
     ========================================================================== */
  initAudioAndStrobe() {
    const audioBtn = document.getElementById('audioBeaconHeaderBtn');
    const strobeBtn = document.getElementById('visualStrobeBtn');
    const strobeOverlay = document.getElementById('strobeOverlay');

    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const isNowPlaying = window.resqAudio.toggleSosBeacon((active) => {
          audioBtn.classList.toggle('active', active);
          audioBtn.innerHTML = active ? '🔊 SOS BEACON (ACTIVE)' : '📢 DISTRESS SOS BEACON';
        });
        if (isNowPlaying) {
          this.showToast('Web Audio 800Hz SOS Morse Beacon (... --- ...) broadcasting', 'warning');
        } else {
          this.showToast('Distress audio beacon stopped', 'info');
        }
      });
    }

    if (strobeBtn && strobeOverlay) {
      strobeBtn.addEventListener('click', () => {
        const isActive = window.resqAudio.toggleVisualStrobe(strobeOverlay);
        if (isActive) {
          this.showToast('Morse Visual Strobe active. Tap anywhere to stop.', 'warning');
        }
      });

      strobeOverlay.addEventListener('click', () => {
        window.resqAudio.toggleVisualStrobe(strobeOverlay);
      });
    }
  },

  /* ==========================================================================
     MODALS & PIN AUTHORIZATION (SECURE PII UNLOCK)
     ========================================================================== */
  initModals() {
    // Modal backdrop close handlers
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });

    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.modal-backdrop').classList.remove('active');
      });
    });

    // Close TX Progress modal
    const closeTxBtn = document.getElementById('closeTxModalBtn');
    if (closeTxBtn) {
      closeTxBtn.addEventListener('click', () => {
        document.getElementById('transmissionModal').classList.remove('active');
      });
    }

    // Confirm Dispatch
    const confirmDispatchBtn = document.getElementById('confirmDispatchBtn');
    if (confirmDispatchBtn) {
      confirmDispatchBtn.addEventListener('click', () => this.confirmDispatchUnit());
    }

    // PIN Auth Submit
    const pinForm = document.getElementById('pinAuthForm');
    if (pinForm) {
      pinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pinInput = document.getElementById('responderPinInput');
        // Preset official demo PIN: 9110
        if (pinInput && pinInput.value === '9110') {
          this.isResponderAuthorized = true;
          document.getElementById('pinAuthModal').classList.remove('active');
          document.getElementById('responderAuthBtn').textContent = '🔓 RESPONDER PII UNLOCKED';
          document.getElementById('responderAuthBtn').style.borderColor = 'var(--safe-green)';
          document.getElementById('responderAuthBtn').style.color = 'var(--safe-green)';
          this.showToast('Responder Access Granted: Citizen PII Unmasked for Rescue Ops', 'success');
          this.renderDashboardIncidents();
        } else {
          this.showToast('Invalid Responder PIN. Default Demo PIN is 9110.', 'critical');
        }
      });
    }
  },

  openPinAuthModal() {
    const modal = document.getElementById('pinAuthModal');
    if (modal) modal.classList.add('active');
  },

  logTerminalLine(text) {
    const termBody = document.getElementById('packetInspectorTerminal');
    if (!termBody) return;

    const time = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    div.className = 'terminal-line';
    div.innerHTML = `<span class="t-time">[${time}]</span> ${text}`;
    termBody.appendChild(div);
    termBody.scrollTop = termBody.scrollHeight;
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${type === 'critical' ? '🚨' : (type === 'success' ? '✔' : 'ℹ️')}</span>
      <div>${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  },

  downloadFile(filename, content, contentType) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  formatTimeAgo(isoString) {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins === 1) return '1m ago';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  },

  getDisasterIcon(type) {
    const map = {
      flood: '🌊',
      collapse: '🏚️',
      wildfire: '🔥',
      medical: '🩸',
      cyclone: '🌪️',
      hazmat: '☣️'
    };
    return map[type] || '⚠️';
  },

  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
};

window.App = App;
