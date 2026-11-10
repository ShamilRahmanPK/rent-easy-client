// Major Philippine cities, grouped by area. Picking a city also fills in its province or region,
// and tells the map where to open (approximate city centre).
export interface Place {
  city: string;
  province: string;
  latitude: number;
  longitude: number;
}

const place = (city: string, province: string, latitude: number, longitude: number): Place => ({ city, province, latitude, longitude });

export const PLACE_GROUPS: { label: string; places: Place[] }[] = [
  {
    label: "Metro Manila",
    places: [
      place("Makati", "Metro Manila", 14.554, 121.024),
      place("Taguig", "Metro Manila", 14.52, 121.054),
      place("Quezon City", "Metro Manila", 14.676, 121.044),
      place("Manila", "Metro Manila", 14.599, 120.984),
      place("Pasig", "Metro Manila", 14.576, 121.085),
      place("Mandaluyong", "Metro Manila", 14.579, 121.036),
      place("Parañaque", "Metro Manila", 14.479, 121.02),
      place("Pasay", "Metro Manila", 14.537, 121.001),
      place("Las Piñas", "Metro Manila", 14.445, 120.993),
      place("Muntinlupa", "Metro Manila", 14.408, 121.041),
      place("Marikina", "Metro Manila", 14.65, 121.103),
      place("San Juan", "Metro Manila", 14.6, 121.036),
      place("Caloocan", "Metro Manila", 14.65, 120.967),
      place("Valenzuela", "Metro Manila", 14.7, 120.983),
      place("Malabon", "Metro Manila", 14.662, 120.957),
      place("Navotas", "Metro Manila", 14.667, 120.941),
    ],
  },
  {
    label: "Luzon",
    places: [
      place("Antipolo", "Rizal", 14.586, 121.176),
      place("Cainta", "Rizal", 14.578, 121.122),
      place("Bacoor", "Cavite", 14.459, 120.943),
      place("Imus", "Cavite", 14.43, 120.937),
      place("Dasmariñas", "Cavite", 14.329, 120.937),
      place("Tagaytay", "Cavite", 14.11, 120.962),
      place("Santa Rosa", "Laguna", 14.312, 121.112),
      place("Calamba", "Laguna", 14.211, 121.165),
      place("Biñan", "Laguna", 14.334, 121.08),
      place("Lipa", "Batangas", 13.941, 121.163),
      place("Batangas City", "Batangas", 13.756, 121.058),
      place("Angeles", "Pampanga", 15.145, 120.595),
      place("San Fernando", "Pampanga", 15.029, 120.689),
      place("Baguio", "Benguet", 16.402, 120.596),
      place("Olongapo", "Zambales", 14.829, 120.282),
      place("Naga", "Camarines Sur", 13.622, 123.195),
      place("Legazpi", "Albay", 13.139, 123.744),
    ],
  },
  {
    label: "Visayas",
    places: [
      place("Cebu City", "Cebu", 10.317, 123.891),
      place("Mandaue", "Cebu", 10.324, 123.942),
      place("Lapu-Lapu", "Cebu", 10.31, 123.949),
      place("Iloilo City", "Iloilo", 10.72, 122.562),
      place("Bacolod", "Negros Occidental", 10.667, 122.95),
      place("Dumaguete", "Negros Oriental", 9.307, 123.306),
      place("Tacloban", "Leyte", 11.244, 125.004),
      place("Tagbilaran", "Bohol", 9.647, 123.856),
    ],
  },
  {
    label: "Mindanao and Palawan",
    places: [
      place("Davao City", "Davao del Sur", 7.073, 125.613),
      place("Cagayan de Oro", "Misamis Oriental", 8.477, 124.646),
      place("General Santos", "South Cotabato", 6.112, 125.172),
      place("Zamboanga City", "Zamboanga del Sur", 6.91, 122.074),
      place("Butuan", "Agusan del Norte", 8.949, 125.541),
      place("Iligan", "Lanao del Norte", 8.228, 124.245),
      place("Puerto Princesa", "Palawan", 9.739, 118.735),
    ],
  },
]

export const ALL_PLACES: Place[] = PLACE_GROUPS.flatMap((group) => group.places);
export const findPlace = (city: string) => ALL_PLACES.find((item) => item.city.toLowerCase() === city.toLowerCase());
export const COUNTRY = "Philippines";
// Where the map opens when no city is known yet.
export const PHILIPPINES_CENTER = { latitude: 12.8797, longitude: 121.774 };
