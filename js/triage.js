/**
 * OFFGRID-RESQ – RULE-BASED TRIAGE & PRIORITY CLASSIFIER
 * Deterministic Emergency Scoring Engine that classifies incidents into
 * CRITICAL, HIGH, or MEDIUM priority based on medical triage protocols (SALT/START),
 * environmental hazards, vulnerable populations, and off-grid telemetry constraints.
 */

class EmergencyTriageClassifier {
  constructor() {
    this.VERSION = '1.0.4-HEURISTIC-OFFLINE';
  }

  /**
   * Evaluates an SOS report and returns priority level, numeric score, and breakdown.
   * @param {Object} data 
   * @returns {Object} { priority: 'CRITICAL'|'HIGH'|'MEDIUM', score: Number, rationale: Array<String> }
   */
  classify(data) {
    let score = 0;
    const rationale = [];

    // 1. INJURY SEVERITY (Major weight - START triage protocol)
    switch (data.injurySeverity) {
      case 'life_threatening':
        score += 45;
        rationale.push('Life-threatening trauma or airway compromise (+45 pts)');
        break;
      case 'severe':
        score += 28;
        rationale.push('Severe non-ambulatory injury / major fracture (+28 pts)');
        break;
      case 'minor':
        score += 10;
        rationale.push('Minor ambulatory injuries (+10 pts)');
        break;
      default:
        // 'none' or uninjured
        score += 2;
        break;
    }

    // 2. DISASTER & ENVIRONMENTAL HAZARD TYPE
    switch (data.emergencyType) {
      case 'collapse':
        score += 25;
        rationale.push('Structural collapse / physical entrapment risk (+25 pts)');
        break;
      case 'flood':
        score += 22;
        rationale.push('Rapid water level rise / drowning threat (+22 pts)');
        break;
      case 'wildfire':
        score += 24;
        rationale.push('Thermal hazard and heavy smoke inhalation risk (+24 pts)');
        break;
      case 'hazmat':
        score += 20;
        rationale.push('Hazardous chemical / toxic vapor exposure (+20 pts)');
        break;
      case 'medical':
        score += 18;
        rationale.push('Acute off-grid medical emergency (+18 pts)');
        break;
      case 'cyclone':
        score += 12;
        rationale.push('Extreme wind and projectile hazard (+12 pts)');
        break;
      default:
        score += 8;
        break;
    }

    // 3. IMMEDIATE HAZARD CONDITIONS
    if (data.hazards && Array.isArray(data.hazards)) {
      if (data.hazards.includes('rising_water')) {
        score += 12;
        rationale.push('Active flood water rising (+12 pts)');
      }
      if (data.hazards.includes('live_wires')) {
        score += 10;
        rationale.push('Downed high-voltage electrical lines (+10 pts)');
      }
      if (data.hazards.includes('heavy_smoke')) {
        score += 8;
        rationale.push('Asphyxiation hazard from smoke (+8 pts)');
      }
      if (data.hazards.includes('debris_shifting')) {
        score += 10;
        rationale.push('Unstable structural shifting (+10 pts)');
      }
    }

    // 4. VULNERABLE POPULATIONS
    if (data.vulnerabilities && Array.isArray(data.vulnerabilities)) {
      if (data.vulnerabilities.includes('infants')) {
        score += 14;
        rationale.push('Infants / young children present (+14 pts)');
      }
      if (data.vulnerabilities.includes('medical_dependent')) {
        score += 16;
        rationale.push('Critical medical dependency (Oxygen/Insulin/Dialysis) (+16 pts)');
      }
      if (data.vulnerabilities.includes('mobility_impaired')) {
        score += 12;
        rationale.push('Non-ambulatory / wheelchair-bound individuals (+12 pts)');
      }
      if (data.vulnerabilities.includes('elderly')) {
        score += 8;
        rationale.push('Geriatric population with limited mobility (+8 pts)');
      }
    }

    // 5. SCALE OF IMPACT (People affected)
    const peopleCount = parseInt(data.peopleAffected, 10) || 1;
    if (peopleCount > 10) {
      score += 18;
      rationale.push(`Mass casualty threat: ${peopleCount} individuals trapped (+18 pts)`);
    } else if (peopleCount > 4) {
      score += 10;
      rationale.push(`Multiple individuals affected: ${peopleCount} people (+10 pts)`);
    }

    // 6. CONNECTION DIFFICULTY & BATTERY TELEMETRY (Off-Grid specific penalty)
    // If the node has very low battery or is 3+ hops away on the mesh,
    // window of rescue contact is shrinking rapidly.
    if (data.telemetry) {
      if (data.telemetry.batteryLevel && data.telemetry.batteryLevel < 15) {
        score += 8;
        rationale.push(`Critical transmitter battery (<15%) - imminent signal loss (+8 pts)`);
      }
      if (data.telemetry.meshHops && data.telemetry.meshHops >= 3) {
        score += 5;
        rationale.push(`Remote edge node (${data.telemetry.meshHops} RF hops) (+5 pts)`);
      }
    }

    // Cap at 100
    const finalScore = Math.min(100, Math.max(0, score));

    // CLASSIFICATION THRESHOLDS
    let priority = 'MEDIUM';
    let colorCode = '#ffd600';

    if (finalScore >= 70) {
      priority = 'CRITICAL';
      colorCode = '#ff2a4b';
    } else if (finalScore >= 42) {
      priority = 'HIGH';
      colorCode = '#ff9100';
    } else {
      priority = 'MEDIUM';
      colorCode = '#ffd600';
    }

    return {
      priority: priority,
      score: finalScore,
      colorCode: colorCode,
      rationale: rationale,
      classifierEngine: this.VERSION,
      timestamp: new Date().toISOString()
    };
  }
}

// Global instance
window.resqTriage = new EmergencyTriageClassifier();
