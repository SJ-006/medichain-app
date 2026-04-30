import 'dotenv/config';
// Haversine formula
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c; // in metres
    return d;
};

export const isWithinHospital = (lat: number, lng: number): boolean => {
    const hospitalLat = parseFloat(process.env.HOSPITAL_LAT || '12.9716');
    const hospitalLng = parseFloat(process.env.HOSPITAL_LNG || '77.5946');
    const maxDistance = 500; // 500 meters

    const distance = calculateDistance(lat, lng, hospitalLat, hospitalLng);
    return distance <= maxDistance;
};
