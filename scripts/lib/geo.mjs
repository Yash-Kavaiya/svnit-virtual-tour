export const EARTH_R = 6378137;
const D2R = Math.PI / 180;

export function metersPerDegree(lat0) {
  return {
    mx: EARTH_R * D2R * Math.cos(lat0 * D2R),
    mz: EARTH_R * D2R,
  };
}

export function makeProjector(origin) {
  const { mx, mz } = metersPerDegree(origin.lat);
  return {
    toXZ(ll) {
      return [(ll.lon - origin.lon) * mx, -(ll.lat - origin.lat) * mz];
    },
    toLatLon([x, z]) {
      return { lat: origin.lat - z / mz, lon: origin.lon + x / mx };
    },
  };
}
