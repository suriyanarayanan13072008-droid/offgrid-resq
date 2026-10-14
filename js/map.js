/**
 * OFFGRID-RESQ – SELF-CONTAINED TACTICAL DISASTER CANVAS MAP
 * 100% Offline, Zero external CDN dependencies.
 * Renders high-contrast tactical disaster zone, hazard perimeters,
 * SOS incident beacons with pulsing rings, shelters, and simulated mesh relay links.
 */

class TacticalDisasterMap {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    // Tactical map viewport center (Simulated Disaster Zone Center: Sector 4)
    this.centerLat = 13.0800;
    this.centerLng = 80.2700;
    this.zoom = 18000; // scale factor
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;

    // Simulation pulse animation timer
    this.pulsePhase = 0;
    this.hoveredItem = null;
    this.selectedIncidentId = null;

    // Setup Canvas DPI & Listeners
    this.setupResolution();
    this.attachEvents();
    this.startAnimationLoop();
  }

  setupResolution() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = (rect.height || 480) * dpr;
    this.ctx.scale(dpr, dpr);
    this.displayWidth = rect.width;
    this.displayHeight = rect.height || 480;
  }

  attachEvents() {
    window.addEventListener('resize', () => this.setupResolution());

    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX - this.panX;
      this.dragStartY = e.clientY - this.panY;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.panX = e.clientX - this.dragStartX;
        this.panY = e.clientY - this.dragStartY;
      } else {
        this.checkHover(e);
      }
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      this.zoom = Math.max(5000, Math.min(60000, this.zoom * zoomFactor));
    }, { passive: false });

    this.canvas.addEventListener('click', (e) => {
      this.handleClick(e);
    });
  }

  // Lat/Lng to Screen X/Y conversion
  geoToScreen(lat, lng) {
    const x = this.displayWidth / 2 + (lng - this.centerLng) * this.zoom + this.panX;
    const y = this.displayHeight / 2 - (lat - this.centerLat) * this.zoom + this.panY;
    return { x, y };
  }

  screenToGeo(screenX, screenY) {
    const lng = this.centerLng + (screenX - this.displayWidth / 2 - this.panX) / this.zoom;
    const lat = this.centerLat - (screenY - this.displayHeight / 2 - this.panY) / this.zoom;
    return { lat, lng };
  }

  checkHover(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const incidents = window.resqStorage ? window.resqStorage.getIncidents() : [];
    let found = null;

    for (const inc of incidents) {
      if (!inc.location || !inc.location.coordinates) continue;
      const pt = this.geoToScreen(inc.location.coordinates.lat, inc.location.coordinates.lng);
      const dist = Math.hypot(pt.x - mouseX, pt.y - mouseY);
      if (dist < 15) {
        found = { type: 'incident', item: inc, pt };
        break;
      }
    }

    if (!found && window.resqShelters) {
      for (const shelter of window.resqShelters.shelters) {
        const pt = this.geoToScreen(shelter.coordinates.lat, shelter.coordinates.lng);
        const dist = Math.hypot(pt.x - mouseX, pt.y - mouseY);
        if (dist < 15) {
          found = { type: 'shelter', item: shelter, pt };
          break;
        }
      }
    }

    this.hoveredItem = found;
    this.canvas.style.cursor = found ? 'pointer' : (this.isDragging ? 'grabbing' : 'crosshair');
  }

  handleClick(e) {
    if (this.hoveredItem && this.hoveredItem.type === 'incident') {
      const inc = this.hoveredItem.item;
      this.selectedIncidentId = inc.id;
      if (typeof window.openIncidentModal === 'function') {
        window.openIncidentModal(inc.id);
      }
    }
  }

  focusIncident(lat, lng, incidentId) {
    if (!lat || !lng) return;
    this.centerLat = lat;
    this.centerLng = lng;
    this.panX = 0;
    this.panY = 0;
    this.selectedIncidentId = incidentId || null;
  }

  resetView() {
    this.centerLat = 13.0800;
    this.centerLng = 80.2700;
    this.zoom = 18000;
    this.panX = 0;
    this.panY = 0;
  }

  zoomIn() {
    this.zoom = Math.min(60000, this.zoom * 1.3);
  }

  zoomOut() {
    this.zoom = Math.max(5000, this.zoom * 0.7);
  }

  startAnimationLoop() {
    const render = () => {
      this.pulsePhase = (this.pulsePhase + 0.04) % (Math.PI * 2);
      this.draw();
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.displayWidth;
    const h = this.displayHeight;

    // 1. Dark tactical background
    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, 0, w, h);

    // 2. Tactical grid lines
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    const offsetX = (w / 2 + this.panX) % gridSize;
    const offsetY = (h / 2 + this.panY) % gridSize;

    for (let x = offsetX; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = offsetY; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 3. Draw Simulated Hazard Zones (e.g. Inundated river zone & wildfire sector)
    this.drawHazardZones(ctx);

    // 4. Draw Mesh Relay Network Links (Simulated D2D RF topology)
    this.drawMeshNetwork(ctx);

    // 5. Draw Shelters
    this.drawShelters(ctx);

    // 6. Draw Incidents
    this.drawIncidents(ctx);

    // 7. Draw Tooltip if Hovered
    if (this.hoveredItem) {
      this.drawTooltip(ctx, this.hoveredItem);
    }

    // 8. Draw Compass & HUD Telemetry Overlay
    this.drawHudOverlay(ctx, w, h);
  }

  drawHazardZones(ctx) {
    // Simulated Flood Danger Inundation Zone
    const p1 = this.geoToScreen(13.0680, 80.2520);
    const p2 = this.geoToScreen(13.0720, 80.2640);
    const p3 = this.geoToScreen(13.0770, 80.2750);
    const p4 = this.geoToScreen(13.0720, 80.2820);
    const p5 = this.geoToScreen(13.0650, 80.2680);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.lineTo(p5.x, p5.y);
    ctx.closePath();

    ctx.fillStyle = 'rgba(0, 140, 255, 0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 180, 255, 0.35)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Hazard text label
    const centerZone = this.geoToScreen(13.0710, 80.2650);
    ctx.fillStyle = 'rgba(0, 195, 255, 0.7)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('⚠ HIGH-WATER FLOOD INUNDATION BASIN', centerZone.x - 90, centerZone.y);
    ctx.restore();
  }

  drawMeshNetwork(ctx) {
    // Rescue HQ Base station at center
    const hqPt = this.geoToScreen(13.0835, 80.2707);

    // Simulated Mesh Repeater Towers
    const repeaters = [
      { id: 'NODE-R1', lat: 13.0900, lng: 80.2620 },
      { id: 'NODE-R2', lat: 13.0750, lng: 80.2800 },
      { id: 'NODE-R3', lat: 13.0680, lng: 80.2600 }
    ];

    ctx.save();
    ctx.strokeStyle = 'rgba(179, 136, 255, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 5]);

    repeaters.forEach(rep => {
      const repPt = this.geoToScreen(rep.lat, rep.lng);
      ctx.beginPath();
      ctx.moveTo(hqPt.x, hqPt.y);
      ctx.lineTo(repPt.x, repPt.y);
      ctx.stroke();

      // Draw repeater node icon
      ctx.fillStyle = '#b388ff';
      ctx.beginPath();
      ctx.arc(repPt.x, repPt.y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(179, 136, 255, 0.7)';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText(`⌖ ${rep.id} [LORA 868MHz]`, repPt.x + 8, repPt.y + 3);
    });

    ctx.restore();
  }

  drawShelters(ctx) {
    if (!window.resqShelters) return;
    const shelters = window.resqShelters.shelters;

    shelters.forEach(shelter => {
      const pt = this.geoToScreen(shelter.coordinates.lat, shelter.coordinates.lng);
      
      // Draw Shield Pin
      ctx.save();
      ctx.fillStyle = 'rgba(0, 230, 118, 0.2)';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#00e676';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.fillStyle = '#00e676';
      ctx.font = 'bold 10px "Inter", sans-serif';
      ctx.fillText(`⛨ ${shelter.name.split(' ')[0]}`, pt.x + 10, pt.y + 4);
      ctx.restore();
    });
  }

  drawIncidents(ctx) {
    const incidents = window.resqStorage ? window.resqStorage.getIncidents() : [];
    const pulseRadius = 8 + Math.sin(this.pulsePhase) * 6;

    incidents.forEach(inc => {
      if (!inc.location || !inc.location.coordinates) return;
      const pt = this.geoToScreen(inc.location.coordinates.lat, inc.location.coordinates.lng);

      let color = '#ffd600';
      if (inc.priority === 'CRITICAL') color = '#ff2a4b';
      else if (inc.priority === 'HIGH') color = '#ff9100';

      ctx.save();

      // If status is evacuated / resolved, dim it
      if (inc.status === 'evacuated' || inc.status === 'resolved') {
        ctx.globalAlpha = 0.45;
        color = '#00e676';
      }

      // Pulsing outer ring for active Critical emergencies
      if (inc.priority === 'CRITICAL' && inc.status !== 'evacuated') {
        ctx.strokeStyle = 'rgba(255, 42, 75, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pulseRadius + 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Selected ring
      if (this.selectedIncidentId === inc.id) {
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 14, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Core Beacon Marker
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Minimal ID tag
      ctx.fillStyle = '#f0f6fc';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`${inc.id.substring(inc.id.lastIndexOf('-') + 1)}`, pt.x + 9, pt.y + 3);

      ctx.restore();
    });
  }

  drawTooltip(ctx, hovered) {
    const pt = hovered.pt;
    ctx.save();
    let textTitle = '';
    let textSub = '';

    if (hovered.type === 'incident') {
      const inc = hovered.item;
      textTitle = `[${inc.priority}] ${inc.id} - ${inc.emergencyType.toUpperCase()}`;
      textSub = `${inc.peopleAffected} souls | Status: ${inc.status.toUpperCase()}`;
    } else {
      const sh = hovered.item;
      textTitle = `[SAFE HAVEN] ${sh.name}`;
      textSub = `Cap: ${sh.currentOccupancy}/${sh.capacity} | Elev: +${sh.elevationMeters}m`;
    }

    ctx.font = 'bold 11px "Inter", sans-serif';
    const textWidth = Math.max(ctx.measureText(textTitle).width, ctx.measureText(textSub).width) + 20;
    const boxH = 46;
    const boxX = Math.min(this.displayWidth - textWidth - 10, Math.max(10, pt.x - textWidth / 2));
    const boxY = Math.max(10, pt.y - boxH - 12);

    ctx.fillStyle = 'rgba(10, 16, 27, 0.95)';
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, textWidth, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(textTitle, boxX + 10, boxY + 18);
    ctx.fillStyle = '#8fa0ba';
    ctx.font = '10px "Inter", sans-serif';
    ctx.fillText(textSub, boxX + 10, boxY + 34);

    ctx.restore();
  }

  drawHudOverlay(ctx, w, h) {
    ctx.save();
    // Grid coordinate readout at bottom left
    const mouseGeo = this.screenToGeo(w / 2, h / 2);
    ctx.fillStyle = 'rgba(0, 229, 255, 0.7)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(`CENTER: ${mouseGeo.lat.toFixed(4)}°N, ${mouseGeo.lng.toFixed(4)}°E | ZOOM: ${(this.zoom / 1000).toFixed(1)}k`, 14, h - 14);

    // Compass Rose at top left
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(30, 30, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ff2a4b';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText('N', 27, 24);
    ctx.restore();
  }
}

// Global instance initialized when DOM is ready
window.TacticalDisasterMap = TacticalDisasterMap;
