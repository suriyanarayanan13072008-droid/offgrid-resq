/**
 * OFFGRID-RESQ – OFFLINE SHELTERS DIRECTORY & EMERGENCY PLAYBOOKS
 * Provides pre-cached emergency safe havens, Haversine distance calculator,
 * and comprehensive offline disaster response playbooks.
 */

const PRECACHED_SHELTERS = [
  {
    id: 'SHELTER-01',
    name: 'Metro Civic Center & Safe Haven',
    type: 'Primary Command Shelter',
    address: '450 Highland Boulevard, Sector 4',
    coordinates: { lat: 13.0835, lng: 80.2707 },
    elevationMeters: 24,
    capacity: 850,
    currentOccupancy: 420,
    status: 'OPEN - ACCESSIBLE',
    contactFreq: 'VHF 146.520 MHz / Ch 8',
    amenities: [
      'Potable Water Tank (10k L)',
      'Backup Solar & Diesel Microgrid',
      'Level-2 Triage Medical Unit',
      'Ham Radio Relay Post',
      'Infant Supplies',
      'Pet Friendly Enclosure'
    ],
    evacRoute: 'Approach via North Ridge Expressway. Low-lying Southern Causeway is submerged.'
  },
  {
    id: 'SHELTER-02',
    name: 'St. Jude Hilltop Medical Haven',
    type: 'Critical Care Shelter',
    address: '88 Summit Ridge Road, Zone 2',
    coordinates: { lat: 13.0910, lng: 80.2815 },
    elevationMeters: 38,
    capacity: 350,
    currentOccupancy: 310,
    status: 'LIMITED CAPACITY',
    contactFreq: 'VHF 146.550 MHz / Ch 12',
    amenities: [
      'Oxygen Concentrators',
      'Full Emergency Trauma Staff',
      'Emergency Surgical Suite',
      'Life Flight Helipad',
      'Dialysis Backup'
    ],
    evacRoute: 'Summit road is clear. Priority reserved for severe trauma and oxygen-dependent patients.'
  },
  {
    id: 'SHELTER-03',
    name: 'Valley Sports Arena & Evacuation Post',
    type: 'Mass Evacuation Shelter',
    address: '120 Stadium Way, River Ward',
    coordinates: { lat: 13.0720, lng: 80.2590 },
    elevationMeters: 14,
    capacity: 1200,
    currentOccupancy: 640,
    status: 'OPEN - HIGH WATER BUFFER',
    contactFreq: 'VHF 146.580 MHz / Ch 4',
    amenities: [
      'Hot Meals Field Kitchen',
      'Water Filtration Plant',
      'Amphibious Vehicle Dock',
      'Children Play Area',
      'Generator Power'
    ],
    evacRoute: 'Access strictly via Elevated Skyway Ramp 3. Lower parking lots are impassable.'
  },
  {
    id: 'SHELTER-04',
    name: 'Highland Technical Institute Campus',
    type: 'Technical & Logistics Hub',
    address: '900 Innovation Parkway, Sector 9',
    coordinates: { lat: 13.0640, lng: 80.2780 },
    elevationMeters: 29,
    capacity: 500,
    currentOccupancy: 180,
    status: 'OPEN - AMPLE CAPACITY',
    contactFreq: 'VHF 147.100 MHz / Ch 16',
    amenities: [
      'Battery Recharging Stations',
      'Satellite Telemetry Link (Simulated)',
      'Clean Water Wells',
      'Search & Rescue Staging Base'
    ],
    evacRoute: 'Primary thoroughfares open. Good for non-ambulatory transport vehicles.'
  }
];

const DISASTER_PLAYBOOKS = [
  {
    id: 'flood-playbook',
    title: 'Flash Flood & Rising Waters Survival',
    icon: '🌊',
    badge: 'Hydro Hazard',
    color: '#00e5ff',
    steps: [
      'Never attempt to walk, swim, or drive through moving water. 6 inches of rapid water sweeps humans; 12 inches moves vehicles.',
      'Seek immediate high ground or multi-story structures. Do not hide in enclosed attics without roof access or an ax.',
      'Kill main electrical breakers if water enters living areas to prevent electrocution.',
      'Signal rescuers from the roof using brightly colored clothing, mirrors, or high-intensity flashlights.',
      'Keep your emergency grab-bag waterproofed (ziplock bags for medicines, IDs, and offline devices).'
    ]
  },
  {
    id: 'collapse-playbook',
    title: 'Earthquake & Structural Entrapment',
    icon: '🏚️',
    badge: 'Structural Hazard',
    color: '#ff9100',
    steps: [
      'If trapped under debris: Protect airway with a cloth to minimize dust and smoke inhalation.',
      'Conserve vocal energy: Do not shout continuously. Tap on metal pipes or masonry in rhythmic triples (Tap-Tap-Tap) for acoustic listening gear.',
      'Check for bleeding and apply direct pressure or tourniquets immediately using available cloth and sticks.',
      'Avoid open flames or matches due to potential ruptured natural gas mains.',
      'Stay calm. Acoustic seismic listening sensors used by SAR teams can detect subtle vibrations.'
    ]
  },
  {
    id: 'wildfire-playbook',
    title: 'Wildfire & Thermal Defense Protocol',
    icon: '🔥',
    badge: 'Thermal Hazard',
    color: '#ff2a4b',
    steps: [
      'Evacuate immediately upon early notice. If trapped by fire front, find areas with no fuel (bare soil, riverbanks, burnt ground).',
      'Stay low: Superheated toxic air and carbon monoxide rise. Crawl on hands and knees with wet fabric covering nose and mouth.',
      'Wear 100% natural fibers (wool, heavy cotton). Avoid synthetics (nylon/polyester) which melt onto human skin.',
      'Close all interior doors in structures to slow thermal convection and oxygen draft feeding the blaze.',
      'Clear a 30-foot defensible buffer around your shelter if time permits.'
    ]
  },
  {
    id: 'trauma-playbook',
    title: 'Severe Trauma, Bleeding & First Aid',
    icon: '🩸',
    badge: 'Medical Protocol',
    color: '#ff1744',
    steps: [
      'Control Severe Hemorrhage: Apply firm, relentless two-handed direct pressure over the wound using clean gauze or cloth.',
      'Arterial Bleeding (Pulsing bright red): Apply a commercial tourniquet or improvised windlass 2-3 inches above wound (never over a joint). Tighten until bleeding stops completely.',
      'Shock Management: Lay victim flat, elevate legs slightly if no pelvic fracture, and keep warm with space blankets or jackets.',
      'Open Chest Wounds: Seal with airtight plastic on 3 sides to create a flutter valve preventing tension pneumothorax.',
      'Do not move victims with suspected spinal trauma unless immediate death from fire/water threatens.'
    ]
  },
  {
    id: 'water-playbook',
    title: 'Off-Grid Potable Water & Sanitation',
    icon: '💧',
    badge: 'Field Sanitation',
    color: '#00e676',
    steps: [
      'Boiling: Bring water to a rolling boil for a full 1 minute (3 minutes at elevations > 2,000 meters) to kill all parasites and bacteria.',
      'SODIS (Solar Disinfection): Place clear water in clear PET plastic bottles in direct sunlight for 6 hours (UV disinfection).',
      'Chemical Purification: Use unscented household bleach (6-8.25% sodium hypochlorite): 2 drops per 1 liter of clear water, let sit 30 minutes.',
      'Filtration: Prefilter cloudy water through layered sand, crushed charcoal, and dense cloth before boiling.',
      'Never drink floodwater, seawater, or water near chemical spills or industrial plants.'
    ]
  }
];

class SheltersManager {
  constructor() {
    this.shelters = PRECACHED_SHELTERS;
    this.playbooks = DISASTER_PLAYBOOKS;
  }

  /**
   * Calculates Haversine distance in kilometers between two lat/lng coordinates.
   * Completely offline trigonometric calculation!
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;
    return parseFloat(distanceKm.toFixed(2));
  }

  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Returns shelters sorted by proximity to given coordinates.
   */
  getSheltersWithDistances(userLat, userLng) {
    return this.shelters.map(shelter => {
      const dist = (userLat && userLng) 
        ? this.calculateDistance(userLat, userLng, shelter.coordinates.lat, shelter.coordinates.lng)
        : null;
      return {
        ...shelter,
        distanceKm: dist
      };
    }).sort((a, b) => {
      if (a.distanceKm === null) return 0;
      return a.distanceKm - b.distanceKm;
    });
  }
}

// Global instance
window.resqShelters = new SheltersManager();
