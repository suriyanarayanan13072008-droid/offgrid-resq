/**
 * OFFGRID-RESQ – DEDUPLICATION & SECURITY ENGINE
 * Provides:
 * 1. Duplicate suppression via composite fingerprinting & incident IDs.
 * 2. Secure input validation and XSS sanitization.
 * 3. Sensitive data privacy masking (PII protection for citizens).
 * 4. Cryptographic integrity checksum simulation for off-grid mesh packets.
 */

class DedupAndSecurityEngine {
  constructor() {
    this.suppressedCounter = 0;
  }

  /**
   * Sanitizes strings to prevent XSS injection.
   */
  sanitizeText(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .trim();
  }

  /**
   * Generates a unique disaster incident identifier.
   * Format: RESQ-YEAR-RANDOMHEX
   */
  generateIncidentId() {
    const year = new Date().getFullYear();
    const randomHex = Math.random().toString(16).substring(2, 8).toUpperCase();
    return `RESQ-${year}-${randomHex}`;
  }

  /**
   * Creates a deterministic fingerprint for deduplication.
   * Even if a citizen doesn't have an ID or submits repeatedly with slight time delta,
   * matching: emergencyType + approximate coords (~100m grid) + citizen name/contact
   * flags it as a duplicate packet.
   */
  generateFingerprint(data) {
    const type = (data.emergencyType || '').toLowerCase();
    
    // Round coordinates to ~3 decimal places (~110 meters grid resolution)
    let latGrid = '0.000';
    let lngGrid = '0.000';
    if (data.location && data.location.coordinates) {
      latGrid = parseFloat(data.location.coordinates.lat || 0).toFixed(3);
      lngGrid = parseFloat(data.location.coordinates.lng || 0).toFixed(3);
    } else if (data.location && data.location.gridRef) {
      latGrid = (data.location.gridRef || '').toUpperCase().trim();
    }

    const contact = (data.citizen && data.citizen.contact ? data.citizen.contact : '').trim().toLowerCase();
    const name = (data.citizen && data.citizen.name ? data.citizen.name : '').trim().toLowerCase();

    const rawString = `${type}|${latGrid}|${lngGrid}|${contact}|${name}`;
    return this.simpleHash(rawString);
  }

  /**
   * Simple deterministic string hashing algorithm for offline in-browser execution.
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
  }

  /**
   * Generates a simulated HMAC / Integrity verification tag.
   */
  generateIntegrityTag(incidentId, payloadStr) {
    return 'HMAC-' + this.simpleHash(incidentId + '::' + payloadStr).substring(0, 8);
  }

  /**
   * Evaluates if an incoming SOS packet is a duplicate.
   * Checks both exact incident ID AND composite spatial/demographic fingerprint.
   * @param {Object} newSosData 
   * @param {Array} existingIncidents 
   * @returns {Object} { isDuplicate: Boolean, targetIncident: Object|null, reason: String }
   */
  checkDuplicate(newSosData, existingIncidents) {
    if (!existingIncidents || !existingIncidents.length) {
      return { isDuplicate: false, targetIncident: null };
    }

    // 1. Check exact Incident ID match (e.g. repeated mesh broadcast from multi-hop relay)
    if (newSosData.id) {
      const matchById = existingIncidents.find(inc => inc.id === newSosData.id);
      if (matchById) {
        return {
          isDuplicate: true,
          targetIncident: matchById,
          reason: `Exact Incident ID Match: ${newSosData.id} (Rebroadcast packet suppressed)`
        };
      }
    }

    // 2. Check fingerprint match (e.g. citizen clicked SOS again or nearby neighbor reported same incident)
    const newFingerprint = newSosData.fingerprint || this.generateFingerprint(newSosData);
    const matchByFingerprint = existingIncidents.find(inc => {
      // Must be within last 6 hours to count as duplicate incident
      const timeDiffMs = Math.abs(new Date(inc.timestamp).getTime() - new Date(newSosData.timestamp || Date.now()).getTime());
      const isRecent = timeDiffMs < 6 * 60 * 60 * 1000;
      return isRecent && inc.fingerprint === newFingerprint;
    });

    if (matchByFingerprint) {
      return {
        isDuplicate: true,
        targetIncident: matchByFingerprint,
        reason: `Composite Spatial/Triage Fingerprint Match (#${newFingerprint})`
      };
    }

    return { isDuplicate: false, targetIncident: null };
  }

  /**
   * PII Protection: Masks citizen phone and name for public/mesh broadcasts.
   */
  maskPII(citizenData, isAuthorizedResponder = false) {
    if (!citizenData) return { name: 'Anonymous', contact: 'N/A' };
    if (isAuthorizedResponder) return citizenData;

    let maskedName = 'Citizen';
    if (citizenData.name && citizenData.name.trim()) {
      const parts = citizenData.name.trim().split(' ');
      maskedName = parts.map(p => p.charAt(0) + '***').join(' ');
    }

    let maskedContact = 'Protected';
    if (citizenData.contact && citizenData.contact.length > 4) {
      const len = citizenData.contact.length;
      maskedContact = citizenData.contact.substring(0, 3) + '••••' + citizenData.contact.substring(len - 2);
    }

    return {
      name: maskedName,
      contact: maskedContact,
      isMasked: true
    };
  }

  /**
   * Validates form input fields before sending.
   */
  validateSosSubmission(formData) {
    const errors = [];

    if (!formData.emergencyType) {
      errors.push('Emergency type must be selected.');
    }

    const people = parseInt(formData.peopleAffected, 10);
    if (isNaN(people) || people < 1 || people > 500) {
      errors.push('Number of people affected must be between 1 and 500.');
    }

    if (!formData.injurySeverity) {
      errors.push('Injury severity level must be specified.');
    }

    if (!formData.locationText && (!formData.coords || !formData.coords.lat)) {
      errors.push('Please provide GPS coordinates or a descriptive location/landmark.');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
}

// Global instance
window.resqSecurity = new DedupAndSecurityEngine();
