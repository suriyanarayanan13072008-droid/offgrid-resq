# OFFGRID-RESQ – AI-Powered Offline Disaster Communication and Evacuation System

[![Status](https://img.shields.io/badge/Status-Operational-00e676?style=for-the-badge)](http://localhost:8080)
[![Offline](https://img.shields.io/badge/Offline_Capability-100%25_Local_Persistence-00e5ff?style=for-the-badge)](http://localhost:8080)
[![Architecture](https://img.shields.io/badge/Architecture-PWA_Mesh_Hardware_Ready-b388ff?style=for-the-badge)](http://localhost:8080)

**OFFGRID-RESQ** is a responsive, offline-first tactical web application designed for emergency disaster response when traditional communication infrastructure—such as cellular towers, fiber backbones, and the Internet—is partially or completely disabled.

Built using **modern HTML5, Vanilla CSS (Tactical Dark / HUD Theme), and modular JavaScript**, the system bridges the gap between stranded citizens and emergency search-and-rescue (SAR) command centers using browser persistence, heuristic triage scoring, duplicate suppression, and simulated peer-to-peer mesh networking.

---

## 🌟 Key Features

### 1. Citizen SOS Module
- **Disaster Hazard Classification**: Choose from Flash Flood, Structural Collapse / Trapped, Wildfire, Severe Medical Trauma, Cyclone, or Hazmat / Gas Leak.
- **Offline Geolocation**: Uses native HTML5 `navigator.geolocation` with accuracy meters, plus fallback MGRS / landmark grid manual coordinate input.
- **Casualty & Vulnerability Tracking**: Stepper for victim headcount, plus priority flags for infants/children, elderly, mobility-impaired, and medical-dependent individuals (oxygen/insulin).
- **Injury Severity (START Protocol)**: Categorize injuries as *Life-Threatening* (airway/arterial bleed), *Severe* (fracture/pinned), *Minor*, or *None*.
- **Citizen Privacy Shield**: Masks citizen names and telephone numbers on broadcast payloads, keeping them encrypted until authorized rescue personnel enter an emergency access PIN.

### 2. Priority-Based AI / Heuristic Triage Engine
- **Deterministic Offline Triage**: Transparent heuristic classifier calculating scores from 0 to 100 based on injury severity, trapped scale, environmental risks, and off-grid RF connection difficulty.
- **Triage Levels**:
  - 🚨 **CRITICAL (Score 70–100)**: Immediate life-safety threat; pulses at top of command queue.
  - ⚠️ **HIGH (Score 42–69)**: Severe hazard / impending escalation.
  - ℹ️ **MEDIUM (Score 0–41)**: Stable / non-life-threatening.
- **Explainability**: Every incident card includes an *AI Triage Rationale* breakdown showing exact points added.

### 3. Rescue Command Dashboard & Tactical Map
- **Incident Management**: Real-time incident list with status updates (`Pending` → `Acknowledged` → `Dispatched` → `Evacuated`).
- **Interactive Tactical Canvas Map**: 100% offline HTML5 Canvas vector map showing:
  - Pulsing color-coded incident pins.
  - Flood inundation hazard zones and smoke perimeters.
  - Pre-cached evacuation shelters.
  - Simulated LoRa/BLE repeater towers with wireless link overlays.
  - Interactive panning, zooming, and click-to-focus controls.
- **Executive KPIs**: Real-time counters for active reports, critical emergencies, field units dispatched, evacuated souls, and duplicates suppressed.
- **Data Export**: One-click export to structured `JSON` and GIS-ready `GeoJSON`.

### 4. Offline Storage & Outbox Synchronization
- **Browser LocalStorage Flash Memory**: All reports are immediately committed to local device storage, persisting across tab closes and device reboots.
- **Simulate Grid Collapse Mode**: Header toggle switch switches between cloud gateway and pure offline RF mesh simulation.
- **Offline Outbox**: When offline, SOS packets enter the local outbox. When connectivity or mesh sync is triggered, packets are relayed with simulated hop animations.

### 5. Duplicate Suppression Engine
- **Composite Fingerprinting**: In low-bandwidth mesh environments, panicked citizens and multi-hop repeaters often resend duplicate packets. OFFGRID-RESQ hashes `emergencyType + spatialGrid (~100m) + citizenContact` to detect duplicates.
- **Bandwidth Optimization**: Suppresses redundant tickets, increments broadcast counts on existing incidents, and records saved RF bandwidth (~184 bytes per packet).

### 6. Offline Evacuation Guidance & Emergency Playbooks
- **Pre-Cached Shelters Directory**: Lists emergency safe havens with real-time Haversine distance calculations from the user's location, occupancy progress bars, backup power status, and flood elevation levels.
- **5 Field Survival Playbooks**:
  1. *Flash Flood & Rising Waters Survival*
  2. *Earthquake & Structural Entrapment*
  3. *Wildfire & Thermal Defense Protocol*
  4. *Severe Trauma, Bleeding & First Aid*
  5. *Off-Grid Potable Water & Sanitation*

### 7. Field Rescue Signaling Tools
- **800Hz Audio Morse SOS Beacon**: Pure Web Audio API acoustic distress beacon (`... --- ...`) that plays directly through device speakers.
- **Nighttime Helicopter Visual Strobe**: Full-screen high-contrast visual flasher for search-and-rescue aircraft spotting.

### 8. Testing Lab & Diagnostics Dashboard
- **Simulation Transparency**: Clearly distinguishes genuinely implemented browser features from simulated hardware RF physics.
- **Performance Benchmarks**:
  - Delivery success rate gauge (94.8% simulated urban LoRa delivery).
  - Multi-hop propagation latency distribution (120ms to 540ms).
  - Battery consumption impact estimator comparing BLE mesh advertising (~14mA) vs cellular tower search (~320mA).
  - Live Packet Inspector Terminal showing streaming simulated RF packets.
  - **Burst Stress Test**: Generates simultaneous multi-packet bursts to benchmark queue throughput and deduplication.

---

## 🛠️ Architecture & Hardware Abstraction Layer

```
[ Citizen Smartphone / PWA ]
          │ (HTML5 Geolocation + Heuristic Triage)
          ▼
[ Browser LocalStorage Flash Queue ]
          │
          ├── (Real Browser) ──> Web Audio 800Hz SOS & Canvas Radar
          │
          └── (Mesh Layer) ──> [ Simulated / Web Bluetooth / WebSerial ]
                                           │
                                           ▼
                                 [ LoRa 868MHz / BLE 5.0 Mesh ]
                                           │
                                           ▼
                               [ Repeater Nodes R1 / R2 ]
                                           │
                                           ▼
                                [ Rescue Command Base Station ]
```

### Real vs. Simulated Capabilities Breakdown

| Component | Status | Technology |
|---|---|---|
| **Local Storage** | ✅ 100% Implemented | Browser HTML5 LocalStorage & Cache |
| **GPS Geolocation** | ✅ 100% Implemented | Browser HTML5 Geolocation API + Grid Fallback |
| **Heuristic Triage** | ✅ 100% Implemented | Deterministic START triage rule-based engine |
| **Duplicate Suppression** | ✅ 100% Implemented | Spatial/demographic composite hashing |
| **Tactical Canvas Map** | ✅ 100% Implemented | HTML5 Canvas vector engine (Zero external CDN) |
| **Distress Audio Beacon** | ✅ 100% Implemented | Synthesized Web Audio API 800Hz Morse generator |
| **Multi-Hop RF Mesh** | ⚡ Simulated | LoRa/BLE propagation model + Web Bluetooth/Serial hooks |

---

## 🚀 Running Locally

The application is self-contained with no external build tools required.

### Option 1: Python HTTP Server (Already active on port 8080)
```powershell
python -m http.server 8080
```
Open **[http://localhost:8080](http://localhost:8080)** in any modern web browser.

### Option 2: Node.js http-server
```powershell
npx -y serve . -l 8080
```

---

## 🔐 Demo Responder Access PIN
To test unmasking citizen privacy data in the Rescue Command Dashboard:
- Click **"Responder PIN Unlock"**
- Enter Demo PIN: **`9110`**
