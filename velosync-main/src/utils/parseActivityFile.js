/**
 * Parse activity files (GPX, TCX, KML, GeoJSON, CSV) entirely in the browser.
 */

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcStats(points) {
  let distanceKm = 0;
  let elevationGainM = 0;
  let maxSpeedKmh = 0;
  let totalHr = 0, hrCount = 0, maxHr = 0;
  let totalCadence = 0, cadenceCount = 0, maxCadence = 0;
  let totalPower = 0, powerCount = 0, maxPower = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    distanceKm += haversineKm(prev.lat, prev.lng, curr.lat, curr.lng);

    if (curr.elevation != null && prev.elevation != null) {
      const gain = curr.elevation - prev.elevation;
      if (gain > 0) elevationGainM += gain;
    }

    // Compute speed from timestamps if not already set
    if (!curr.speed && curr.timestamp && prev.timestamp) {
      const dt = (new Date(curr.timestamp) - new Date(prev.timestamp)) / 3600000;
      const segDist = haversineKm(prev.lat, prev.lng, curr.lat, curr.lng);
      if (dt > 0) curr.speed = segDist / dt;
    }

    if (curr.speed && curr.speed > maxSpeedKmh) maxSpeedKmh = curr.speed;

    if (curr.heart_rate && curr.heart_rate > 0) {
      totalHr += curr.heart_rate;
      hrCount++;
      if (curr.heart_rate > maxHr) maxHr = curr.heart_rate;
    }
    if (curr.cadence && curr.cadence > 0) {
      totalCadence += curr.cadence;
      cadenceCount++;
      if (curr.cadence > maxCadence) maxCadence = curr.cadence;
    }
    if (curr.power && curr.power > 0) {
      totalPower += curr.power;
      powerCount++;
      if (curr.power > maxPower) maxPower = curr.power;
    }
  }

  const startTime = points[0]?.timestamp ? new Date(points[0].timestamp) : null;
  const endTime = points[points.length - 1]?.timestamp
    ? new Date(points[points.length - 1].timestamp)
    : null;
  const durationMinutes = startTime && endTime ? (endTime - startTime) / 60000 : 0;
  const avgSpeedKmh = durationMinutes > 0 ? distanceKm / (durationMinutes / 60) : 0;

  return {
    distanceKm: parseFloat(distanceKm.toFixed(2)),
    durationMinutes: parseFloat(durationMinutes.toFixed(1)),
    avgSpeedKmh: parseFloat(avgSpeedKmh.toFixed(1)),
    maxSpeedKmh: parseFloat(maxSpeedKmh.toFixed(1)),
    elevationGainM: parseFloat(elevationGainM.toFixed(0)),
    avgHeartRate: hrCount > 0 ? Math.round(totalHr / hrCount) : null,
    maxHeartRate: maxHr > 0 ? maxHr : null,
    avgCadence: cadenceCount > 0 ? Math.round(totalCadence / cadenceCount) : null,
    maxCadence: maxCadence > 0 ? maxCadence : null,
    avgPowerW: powerCount > 0 ? Math.round(totalPower / powerCount) : null,
    maxPowerW: maxPower > 0 ? maxPower : null,
    startTime: startTime?.toISOString() || null,
    endTime: endTime?.toISOString() || null,
  };
}

function getTagText(el, tagName) {
  const node = el.querySelector(tagName);
  return node ? node.textContent.trim() : null;
}

function parseGPX(text) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "application/xml");

  // Try trkpt first, fall back to wpt
  let pts = Array.from(doc.querySelectorAll("trkpt"));
  if (!pts.length) pts = Array.from(doc.querySelectorAll("wpt"));

  // Also read track name / type
  const trackName = getTagText(doc, "trk > name") || getTagText(doc, "metadata > name");
  const trackType = getTagText(doc, "trk > type"); // e.g. "EBikeRide"

  const points = pts
    .map((pt) => {
      const lat = parseFloat(pt.getAttribute("lat"));
      const lng = parseFloat(pt.getAttribute("lon"));
      if (isNaN(lat) || isNaN(lng)) return null;

      const elevation = pt.querySelector("ele")
        ? parseFloat(pt.querySelector("ele").textContent)
        : null;
      const timestamp = pt.querySelector("time")
        ? pt.querySelector("time").textContent.trim()
        : null;

      // Extensions — handle any namespace
      const ext = pt.querySelector("extensions");
      const cadence = ext ? parseFloat(getTagText(ext, "cadence")) || null : null;
      const heartrate = ext ? parseInt(getTagText(ext, "heartrate") || getTagText(ext, "hr")) || null : null;
      const power = ext ? parseFloat(getTagText(ext, "power")) || null : null;
      // Speed tag (some devices include it in m/s)
      const speedRaw = ext ? parseFloat(getTagText(ext, "speed")) : null;
      const speed = speedRaw ? speedRaw * 3.6 : null; // m/s → km/h

      return {
        lat,
        lng,
        elevation,
        timestamp,
        speed,
        heart_rate: heartrate && heartrate > 0 ? heartrate : null,
        cadence: cadence && cadence > 0 ? cadence : null,
        power: power && power > 0 ? power : null,
      };
    })
    .filter(Boolean);

  return { points, trackName, trackType };
}

function parseTCX(text) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "application/xml");
  const trackpoints = Array.from(doc.querySelectorAll("Trackpoint"));

  const points = trackpoints
    .map((tp) => {
      const pos = tp.querySelector("Position");
      if (!pos) return null;
      const lat = parseFloat(
        pos.querySelector("LatitudeDegrees")?.textContent
      );
      const lng = parseFloat(
        pos.querySelector("LongitudeDegrees")?.textContent
      );
      if (isNaN(lat) || isNaN(lng)) return null;
      const elevation = parseFloat(
        tp.querySelector("AltitudeMeters")?.textContent
      ) || null;
      const timestamp = tp.querySelector("Time")?.textContent?.trim() || null;
      const speedRaw = parseFloat(tp.querySelector("Speed")?.textContent) || null;
      const speed = speedRaw ? speedRaw * 3.6 : null;
      const hrValue = tp.querySelector("HeartRateBpm Value");
      const heart_rate = hrValue ? parseInt(hrValue.textContent) || null : null;
      const cadence = parseInt(tp.querySelector("Cadence")?.textContent) || null;
      const watts = parseFloat(tp.querySelector("Watts")?.textContent) || null;

      return { lat, lng, elevation, timestamp, speed, heart_rate, cadence, power: watts };
    })
    .filter(Boolean);

  const activityName = doc.querySelector("Activity Name")?.textContent?.trim() || null;
  const activitySport = doc.querySelector("Activity")?.getAttribute("Sport") || null;

  return { points, trackName: activityName, trackType: activitySport };
}

function parseKML(text) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "application/xml");
  const name = doc.querySelector("name")?.textContent?.trim() || null;
  const coords = doc.querySelector("coordinates");
  if (!coords) return { points: [], trackName: name, trackType: null };

  const points = coords.textContent
    .trim()
    .split(/\s+/)
    .map((coord) => {
      const [lng, lat, ele] = coord.split(",").map(parseFloat);
      if (isNaN(lat) || isNaN(lng)) return null;
      return { lat, lng, elevation: isNaN(ele) ? null : ele, timestamp: null };
    })
    .filter(Boolean);

  return { points, trackName: name, trackType: null };
}

function parseGeoJSON(text) {
  const geo = JSON.parse(text);
  const points = [];

  const processCoords = (coords) => {
    coords.forEach(([lng, lat, ele]) => {
      if (!isNaN(lat) && !isNaN(lng)) {
        points.push({
          lat,
          lng,
          elevation: ele != null ? ele : null,
          timestamp: null,
        });
      }
    });
  };

  const features =
    geo.type === "FeatureCollection" ? geo.features : [geo];
  features.forEach((f) => {
    const geom = f.geometry || f;
    if (geom.type === "LineString") processCoords(geom.coordinates);
    else if (geom.type === "MultiLineString")
      geom.coordinates.forEach(processCoords);
    else if (geom.type === "Point") {
      const [lng, lat, ele] = geom.coordinates;
      if (!isNaN(lat) && !isNaN(lng))
        points.push({ lat, lng, elevation: ele ?? null, timestamp: null });
    }
  });

  return { points, trackName: null, trackType: null };
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (!lines.length) return { points: [], trackName: null, trackType: null };

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (names) =>
    names.map((n) => header.findIndex((h) => h.includes(n))).find((i) => i >= 0) ?? -1;

  const latIdx = idx(["lat"]);
  const lngIdx = idx(["lon", "lng"]);
  const eleIdx = idx(["ele", "alt"]);
  const timeIdx = idx(["time", "date"]);
  const speedIdx = idx(["speed"]);
  const hrIdx = idx(["heart", "hr"]);

  if (latIdx === -1 || lngIdx === -1)
    return { points: [], trackName: null, trackType: null };

  const points = lines
    .slice(1)
    .map((line) => {
      const cols = line.split(",");
      const lat = parseFloat(cols[latIdx]);
      const lng = parseFloat(cols[lngIdx]);
      if (isNaN(lat) || isNaN(lng)) return null;
      return {
        lat,
        lng,
        elevation: eleIdx >= 0 ? parseFloat(cols[eleIdx]) || null : null,
        timestamp: timeIdx >= 0 ? cols[timeIdx]?.trim() || null : null,
        speed: speedIdx >= 0 ? parseFloat(cols[speedIdx]) || null : null,
        heart_rate: hrIdx >= 0 ? parseInt(cols[hrIdx]) || null : null,
      };
    })
    .filter(Boolean);

  return { points, trackName: null, trackType: null };
}

// Map GPX/TCX sport types to our activity_type enum
function inferActivityType(trackType) {
  if (!trackType) return null;
  const t = trackType.toLowerCase();
  if (t.includes("ebike") || t.includes("e-bike")) return "ebike";
  if (t.includes("mountain") || t.includes("mtb")) return "mountainbike";
  if (t.includes("cycling") || t.includes("biking") || t.includes("ride")) return "cycling";
  if (t.includes("hiking")) return "hiking";
  if (t.includes("running") || t.includes("run")) return "running";
  if (t.includes("walking") || t.includes("walk")) return "walking";
  if (t.includes("swimming")) return "other";
  return null;
}

export async function parseActivityFile(file) {
  const text = await file.text();
  const ext = file.name.split(".").pop().toLowerCase();

  let parsed;

  if (ext === "gpx") {
    parsed = parseGPX(text);
  } else if (ext === "tcx") {
    parsed = parseTCX(text);
  } else if (ext === "kml") {
    parsed = parseKML(text);
  } else if (ext === "geojson" || ext === "json") {
    parsed = parseGeoJSON(text);
  } else if (ext === "csv") {
    parsed = parseCSV(text);
  } else {
    throw new Error(
      `Filformatet .${ext} stöds inte. Använd GPX, TCX, KML, GeoJSON eller CSV.`
    );
  }

  const { points, trackName, trackType } = parsed;

  if (!points.length) {
    throw new Error("Inga GPS-punkter hittades i filen.");
  }

  const stats = calcStats(points);
  const suggestedActivityType = inferActivityType(trackType);
  const suggestedName =
    trackName || file.name.replace(/\.[^.]+$/, "");

  return {
    routePoints: points,
    suggestedName,
    suggestedActivityType,
    ...stats,
  };
}