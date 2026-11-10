export type Role = "user" | "tenant" | "owner" | "admin" | "super_admin";

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface User {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  roles: Role[];
  emailVerified: boolean;
  status: "Active" | "Suspended" | "Deactivated";
  dateOfBirth: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  notifications: { inApp: boolean; emailUpdates: boolean };
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt?: string;
  idType?: string | null;
  idNumber?: string | null;
  idDocumentFileId?: string | null;
  unreadNotifications?: number;
  propertyCount?: number;
  activeTenancies?: number;
}

export interface FileItem {
  id: string;
  kind: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  isCover: boolean;
  isPrivate: boolean;
  url: string | null;
  thumbUrl: string | null;
  downloadUrl: string | null;
}

export interface Unit {
  id: string;
  code: string;
  propertyId: string;
  unitNumber: string;
  floor: number | null;
  unitType: string;
  bedrooms: number;
  bathrooms: number;
  floorArea: number;
  furnishing: string;
  monthlyRent: number;
  securityDeposit: number | null;
  minLeaseMonths: number | null;
  noticePeriodMonths: number | null;
  utilities: "NotIncluded" | "Partly" | "AllIncluded";
  availableFrom: string | null;
  petsAllowed: boolean;
  smokingAllowed: boolean;
  features: string[];
  description: string | null;
  status: "Vacant" | "Occupied" | "UnderMaintenance";
  photos: FileItem[];
  coverPhoto: FileItem | null;
}

export interface Property {
  id: string;
  code: string;
  name: string;
  propertyType: string;
  description: string | null;
  address: { street: string; city: string; province: string; postalCode: string | null; landmark: string | null; country: string };
  location: { latitude: number; longitude: number } | null;
  yearBuilt: number | null;
  totalFloors: number | null;
  parkingSlots: number | null;
  amenities: string[];
  totalUnits: number;
  ownerId: string;
  owner?: { id: string; userId: string; fullName: string; email: string };
  approvalStatus: "Pending" | "Approved" | "Rejected";
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  listingStatus: "Draft" | "Listed" | "Hidden" | "Archived";
  photos: FileItem[];
  coverPhoto: FileItem | null;
  documents?: FileItem[];
  units?: Unit[];
  createdAt: string;
}

export interface ListingCard {
  id: string;
  code: string;
  unitNumber: string;
  unitType: string;
  bedrooms: number;
  bathrooms: number;
  floorArea: number;
  furnishing: string;
  monthlyRent: number;
  availableFrom: string | null;
  coverPhoto: FileItem | null;
  photos: FileItem[];
  utilities: "NotIncluded" | "Partly" | "AllIncluded";
  petsAllowed: boolean;
  minLeaseMonths: number | null;
  property: { id: string; code: string; name: string; propertyType: string; city: string; province: string; landmark: string | null; country: string };
}

export interface ListingDetail {
  currency: string;
  unit: Unit;
  gallery: FileItem[];
  property: {
    id: string;
    code: string;
    name: string;
    propertyType: string;
    description: string | null;
    address: { street: string; city: string; province: string; postalCode: string | null; landmark: string | null; country: string };
    location: { latitude: number; longitude: number } | null;
    yearBuilt: number | null;
    totalFloors: number | null;
    parkingSlots: number | null;
    amenities: string[];
  };
}

export interface PublicFilters {
  currency: string;
  cities: string[];
  cityCounts: { city: string; count: number }[];
  rent: { min: number | null; max: number | null };
  propertyTypes: string[];
  amenities: string[];
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface Tenancy {
  id: string;
  status: "Active" | "Ended";
  startDate: string;
  endDate: string | null;
  unit: { id: string; code: string; unitNumber: string };
  property: { id: string; code: string; name: string };
  tenant?: { id: string; userId: string; fullName: string; email?: string };
}

export interface RentRequest {
  id: string;
  status: "Pending" | "Approved" | "Rejected" | "Cancelled";
  message: string | null;
  decisionNote: string | null;
  createdAt: string;
  unit: { id: string; code: string; unitNumber: string; monthlyRent: number };
  property: { id: string; code: string; name: string };
  requester?: { id: string; userId: string; fullName: string; email: string };
}

export interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
  ip: string | null;
  actor: { id: string; fullName: string; email: string } | null;
  before: unknown;
  after: unknown;
}

export interface MailLogEntry {
  id: string;
  toEmail: string;
  subject: string;
  template: string;
  status: "Queued" | "Sent" | "Failed";
  attempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface EmailSettings {
  host: string;
  port: number;
  encryption: "ssl" | "starttls";
  username: string;
  passwordSet: boolean;
  fromName: string;
  fromAddress: string;
  replyTo: string;
  adminAlertEmail: string;
}

export interface EmailTemplate {
  key: string;
  essential: boolean;
  placeholders: string[];
  customised: boolean;
  subject: string;
  bodyHtml: string;
}
