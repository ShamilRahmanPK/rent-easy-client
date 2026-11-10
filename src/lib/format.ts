import type { Role } from "./types";

export function formatMoney(amount: number | null | undefined, currency = "PHP"): string {
  if (amount === null || amount === undefined) return "-";
  const whole = Number.isInteger(amount);
  return `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function timeAgo(value: string): string {
  const seconds = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(value);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";

type Option = { value: string; label: string };

export const PROPERTY_TYPES: Option[] = [
  { value: "apartment_building", label: "Apartment building" },
  { value: "condominium", label: "Condominium" },
  { value: "house", label: "House" },
  { value: "townhouse", label: "Townhouse" },
  { value: "commercial", label: "Commercial" },
];
export const UNIT_TYPES: Option[] = [
  { value: "studio", label: "Studio" },
  { value: "one_bedroom", label: "1-bedroom" },
  { value: "two_bedroom", label: "2-bedroom" },
  { value: "three_bedroom", label: "3-bedroom" },
  { value: "house", label: "House" },
  { value: "room", label: "Room" },
];
export const FURNISHING: Option[] = [
  { value: "Unfurnished", label: "Unfurnished" },
  { value: "SemiFurnished", label: "Semi-furnished" },
  { value: "FullyFurnished", label: "Fully furnished" },
];
export const AMENITIES: Option[] = [
  { value: "swimming_pool", label: "Swimming pool" },
  { value: "gym", label: "Gym" },
  { value: "security", label: "24h security" },
  { value: "elevator", label: "Elevator" },
  { value: "parking", label: "Parking" },
  { value: "playground", label: "Playground" },
  { value: "garden", label: "Garden" },
  { value: "cctv", label: "CCTV" },
  { value: "generator", label: "Generator" },
];
export const UNIT_FEATURES: Option[] = [
  { value: "air_conditioning", label: "Air conditioning" },
  { value: "balcony", label: "Balcony" },
  { value: "kitchen_appliances", label: "Kitchen appliances" },
  { value: "washing_machine", label: "Washing machine" },
  { value: "internet_ready", label: "Internet ready" },
  { value: "parking_included", label: "Parking included" },
];
export const ID_TYPES: Option[] = [
  { value: "philsys", label: "PhilSys National ID" },
  { value: "passport", label: "Passport" },
  { value: "umid", label: "UMID" },
  { value: "driving_license", label: "Driver's license" },
  { value: "postal_id", label: "Postal ID" },
  { value: "sss_id", label: "SSS ID" },
  { value: "voters_id", label: "Voter's ID" },
  { value: "prc_id", label: "PRC ID" },
  { value: "other", label: "Other government ID" },
];
// Earlier accounts may hold these. They still display, but are no longer offered.
const LEGACY_ID_TYPES: Option[] = [
  { value: "national_id", label: "National ID" },
  { value: "emirates_id", label: "Emirates ID" },
];
export const idTypeLabel = (value: string | null | undefined) => labelOf([...ID_TYPES, ...LEGACY_ID_TYPES], value);
// What a select should offer: the current list, plus the person's saved value if it is an older one.
export const idTypeOptions = (current: string | null | undefined) =>
  LEGACY_ID_TYPES.some((option) => option.value === current) ? [...ID_TYPES, ...LEGACY_ID_TYPES.filter((option) => option.value === current)] : ID_TYPES;

export const labelOf = (options: Option[], value: string | null | undefined) =>
  options.find((option) => option.value === value)?.label ?? value ?? "-";

export const ROLE_LABEL: Record<Role, string> = {
  user: "User",
  tenant: "Tenant",
  owner: "Owner",
  admin: "Admin",
  super_admin: "Super admin",
};

export const isStaffRole = (roles: Role[] | undefined) => !!roles?.some((role) => role === "admin" || role === "super_admin");
export const hasRole = (roles: Role[] | undefined, role: Role) => !!roles?.includes(role);

export const UTILITIES: Option[] = [
  { value: "NotIncluded", label: "Not included" },
  { value: "Partly", label: "Some included" },
  { value: "AllIncluded", label: "All included" },
];

// A home with no date, or a date that has passed, can be moved into straight away.
export const isReadyToMove = (availableFrom: string | null) => !availableFrom || new Date(`${availableFrom}T00:00:00`) <= new Date();
