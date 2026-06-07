import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  onSnapshot,
  serverTimestamp,
  where,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
import { OperationType, handleFirestoreError } from "./firebase-error";

export interface Member {
  id?: string;
  membershipId?: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  gender?: string;
  age?: number;
  birthday?: string;
  address?: string;
  contactNumber?: string;
  email?: string;
  yearLevel?: string;
  course?: string;
  school?: string;
  voter?: boolean;
  isBaptized?: boolean;
  baptismDate?: string;
  baptismExecutedBy?: string;
  baptismWitness1?: string;
  baptismWitness2?: string;
  fathersName?: string;
  mothersName?: string;
  maritalStatus?: string;
  spouseName?: string;
  membershipStatus: string;
  pictures?: string[];
  network?: string;
  networkLeader?: string;
  ministry?: string;
  ministryHead?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Helper to remove undefined properties from an object so Firestore does not throw an error
const sanitizeData = <T extends Record<string, any>>(data: T): Partial<T> => {
  const sanitized: any = {};
  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined) {
      sanitized[key] = data[key];
    }
  });
  return sanitized;
};

// Helper to serialize Firestore data, converting nested Timestamps to ISO strings
const serializeDoc = (data: any): any => {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map(serializeDoc);
  }
  if (typeof data === "object") {
    if (typeof data.toDate === "function") {
      return data.toDate().toISOString();
    }
    const serialized: any = {};
    for (const key of Object.keys(data)) {
      serialized[key] = serializeDoc(data[key]);
    }
    return serialized;
  }
  return data;
};

// ----------------------------------------------------
// SANDBOX MODE DATABASE INTERFACE SUPPORT
// ----------------------------------------------------
const isSandboxActive = (): boolean => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("scoc_sandbox") === "true";
};

const INITIAL_MOCK_MEMBERS: Member[] = [
  {
    id: "mock_1",
    lastName: "Santos",
    firstName: "Maria Teresa",
    middleName: "Cruz",
    gender: "Female",
    age: 34,
    birthday: "1992-04-12",
    address: "12 Rizal St, Subic, Zambales",
    contactNumber: "0917-123-4567",
    email: "maria.santos@gmail.com",
    voter: true,
    isBaptized: true,
    baptismDate: "2015-08-16",
    baptismExecutedBy: "Bro. Jonathan Almeda",
    baptismWitness1: "Juan Dela Cruz",
    baptismWitness2: "Emma Flores",
    membershipStatus: "Active",
    network: "Subic North Cluster",
    networkLeader: "Bro. Danilo Perez",
    ministry: "Music Ministry",
    ministryHead: "Sis. Teresa Cruz",
    createdAt: "2026-01-10T08:30:00Z",
    updatedAt: "2026-01-10T08:30:00Z"
  },
  {
    id: "mock_2",
    lastName: "Dela Cruz",
    firstName: "John Michael",
    middleName: "Bautista",
    gender: "Male",
    age: 26,
    birthday: "2000-01-20",
    address: "Block 5 Lot 22, Barangay Mangan-Vaca, Subic",
    contactNumber: "0920-987-6543",
    email: "john.dc@gmail.com",
    voter: true,
    isBaptized: true,
    baptismDate: "2018-12-02",
    baptismExecutedBy: "Bro. Ricardo David",
    baptismWitness1: "Carlos Sanchez",
    baptismWitness2: "Elena Reyes",
    membershipStatus: "Regular Attender",
    network: "Youth Central",
    networkLeader: "Bro. John Michael",
    ministry: "Multimedia & Audio",
    ministryHead: "Bro. Michael Reyes",
    createdAt: "2026-02-15T10:15:00Z",
    updatedAt: "2026-02-15T10:15:00Z"
  },
  {
    id: "mock_3",
    lastName: "Perez",
    firstName: "Danilo",
    middleName: "Gomez",
    gender: "Male",
    age: 48,
    birthday: "1978-11-05",
    address: "45 National Highway, Subic, Zambales",
    contactNumber: "0908-222-1111",
    email: "daniloperez@yahoo.com",
    voter: true,
    isBaptized: true,
    baptismDate: "2005-05-18",
    baptismExecutedBy: "Evangelist Mark Ramos",
    baptismWitness1: "Arthur Gomez",
    baptismWitness2: "Aida Perez",
    membershipStatus: "Ministry Leader",
    network: "Subic North Cluster",
    networkLeader: "Bro. Danilo Perez",
    ministry: "Teaching Ministry",
    ministryHead: "Bro. Danilo Perez",
    createdAt: "2026-01-01T09:00:00Z",
    updatedAt: "2026-01-01T09:00:00Z"
  }
];

const INITIAL_MOCK_NETWORKS: Network[] = [
  { id: "net_1", networkName: "Subic North Cluster", networkLeader: "Bro. Danilo Perez", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "net_2", networkName: "Subic South Cluster", networkLeader: "Bro. Ricardo David", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "net_3", networkName: "Youth Central", networkLeader: "Bro. John Michael", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }
];

const INITIAL_MOCK_MINISTRIES: Ministry[] = [
  { id: "min_1", ministryName: "Music Ministry", ministryHead: "Sis. Teresa Cruz", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "min_2", ministryName: "Teaching Ministry", ministryHead: "Bro. Danilo Perez", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "min_3", ministryName: "Multimedia & Audio", ministryHead: "Bro. Michael Reyes", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }
];

const INITIAL_MOCK_EVENTS: ChurchEvent[] = [
  { id: "evt_1", eventName: "SUNDAY DIVINE WORSHIP SERVICE", eventDate: `${new Date().getFullYear()}-06-07T09:00`, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "evt_2", eventName: "MIDWEEK PRAYER AND DISCIPLESHIP", eventDate: `${new Date().getFullYear()}-06-10T19:00`, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "evt_3", eventName: "YOUTH FELLOWSHIP", eventDate: `${new Date().getFullYear()}-06-13T16:00`, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }
];

const INITIAL_MOCK_ATTENDANCE: AttendanceRecord[] = [
  { id: "evt_1_mock_1", eventId: "evt_1", eventName: "SUNDAY DIVINE WORSHIP SERVICE", eventDate: `${new Date().getFullYear()}-06-07T09:00`, memberId: "mock_1", memberName: "Maria Teresa Santos", status: "Present", updatedAt: "2026-06-01T15:00:00Z" },
  { id: "evt_1_mock_2", eventId: "evt_1", eventName: "SUNDAY DIVINE WORSHIP SERVICE", eventDate: `${new Date().getFullYear()}-06-07T09:00`, memberId: "mock_2", memberName: "John Michael Dela Cruz", status: "Absent", updatedAt: "2026-06-01T15:00:00Z" },
  { id: "evt_1_mock_3", eventId: "evt_1", eventName: "SUNDAY DIVINE WORSHIP SERVICE", eventDate: `${new Date().getFullYear()}-06-07T09:00`, memberId: "mock_3", memberName: "Danilo Perez", status: "Present", updatedAt: "2026-06-01T15:00:00Z" }
];

const INITIAL_MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: "log_1", userEmail: "scoc2911@gmail.com", userName: "SCOC Sandbox Admin", action: "Initialized Demo Sandbox Module for database testing.", timestamp: new Date().toISOString() }
];

const INITIAL_MOCK_USER_ROLES: SystemUserRole[] = [
  { id: "sandbox_admin", email: "scoc2911@gmail.com", displayName: "SCOC Sandbox Admin", role: "admin", updatedAt: new Date().toISOString() }
];

const getSandboxData = <T>(key: string, initial: T): T => {
  if (typeof window === "undefined") return initial;
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    return initial;
  }
};

const saveSandboxData = <T>(key: string, data: T) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
};

// Callback Registrations
let membersCallbacks: ((data: Member[]) => void)[] = [];
let networksCallbacks: ((data: Network[]) => void)[] = [];
let ministriesCallbacks: ((data: Ministry[]) => void)[] = [];
let eventsCallbacks: ((data: ChurchEvent[]) => void)[] = [];
let attendanceCallbacks: { [eventId: string]: ((data: AttendanceRecord[]) => void)[] } = {};
let auditLogsCallbacks: ((data: AuditLog[]) => void)[] = [];
let userRolesCallbacks: ((data: SystemUserRole[]) => void)[] = [];

const notifyMembers = () => {
  const data = getSandboxData("scoc_members", INITIAL_MOCK_MEMBERS);
  membersCallbacks.forEach(cb => cb(data));
};
const notifyNetworks = () => {
  const data = getSandboxData("scoc_networks", INITIAL_MOCK_NETWORKS);
  networksCallbacks.forEach(cb => cb(data));
};
const notifyMinistries = () => {
  const data = getSandboxData("scoc_ministries", INITIAL_MOCK_MINISTRIES);
  ministriesCallbacks.forEach(cb => cb(data));
};
const notifyEvents = () => {
  const data = getSandboxData("scoc_events", INITIAL_MOCK_EVENTS);
  const sorted = [...data].sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  eventsCallbacks.forEach(cb => cb(sorted));
};
const notifyAttendance = (eventId: string) => {
  const data = getSandboxData("scoc_attendance", INITIAL_MOCK_ATTENDANCE);
  const filtered = data.filter(r => r.eventId === eventId);
  const callbacks = attendanceCallbacks[eventId] || [];
  callbacks.forEach(cb => cb(filtered));
};
const notifyAuditLogs = () => {
  const data = getSandboxData("scoc_auditLogs", INITIAL_MOCK_AUDIT_LOGS);
  const sorted = [...data].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  auditLogsCallbacks.forEach(cb => cb(sorted));
};
const notifyUserRoles = () => {
  const data = getSandboxData("scoc_userRoles", INITIAL_MOCK_USER_ROLES);
  userRolesCallbacks.forEach(cb => cb(data));
};

export const subscribeToMembers = (callback: (members: Member[]) => void) => {
  if (isSandboxActive()) {
    membersCallbacks.push(callback);
    callback(getSandboxData("scoc_members", INITIAL_MOCK_MEMBERS));
    return () => {
      membersCallbacks = membersCallbacks.filter((cb) => cb !== callback);
    };
  }

  const q = query(collection(db, "members"));
  return onSnapshot(
    q,
    (snapshot) => {
      const members = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...serializeDoc(doc.data()),
      })) as Member[];
      callback(members);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, "members");
    }
  );
};

export const subscribeToMyProfile = (email: string, callback: (member: Member | null) => void) => {
  if (isSandboxActive()) {
    const data = getSandboxData("scoc_members", INITIAL_MOCK_MEMBERS);
    const matched = data.find((m) => m.email?.toLowerCase().trim() === email.toLowerCase().trim());
    callback(matched || null);
    return () => {};
  }

  const normalized = email.trim();
  const lower = normalized.toLowerCase();
  const upper = normalized.toUpperCase();
  const parts = normalized.split("@");
  const capitalized = parts.length > 1
    ? `${parts[0].charAt(0).toUpperCase()}${parts[0].slice(1).toLowerCase()}@${parts[1].toLowerCase()}`
    : normalized;

  const emailVariants = Array.from(new Set([normalized, lower, upper, capitalized]));

  const q = query(
    collection(db, "members"),
    where("email", "in", emailVariants)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        callback({
          id: docSnap.id,
          ...serializeDoc(docSnap.data()),
        } as Member);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error("subscribeToMyProfile error:", error);
      callback(null);
    }
  );
};

export const checkDuplicateMember = async (
  firstName: string,
  lastName: string,
  birthday?: string,
  contactNumber?: string,
  email?: string
): Promise<Member | null> => {
  if (isSandboxActive()) {
    const data = getSandboxData("scoc_members", INITIAL_MOCK_MEMBERS);
    const match = data.find((m) => {
      const sameName = m.firstName.trim().toUpperCase() === firstName.trim().toUpperCase() &&
                       m.lastName.trim().toUpperCase() === lastName.trim().toUpperCase();
      if (!sameName) return false;

      if (birthday && m.birthday && m.birthday === birthday) return true;
      if (contactNumber && m.contactNumber) {
        const c1 = contactNumber.replace(/[^0-9]/g, "");
        const c2 = m.contactNumber.replace(/[^0-9]/g, "");
        if (c1 && c2 && c1 === c2) return true;
      }
      if (email && m.email && email.trim().toUpperCase() === m.email.trim().toUpperCase()) return true;

      const hasNoIdentifiersInNew = !birthday && !contactNumber && !email;
      const hasNoIdentifiersInExisting = !m.birthday && !m.contactNumber && !m.email;
      if (hasNoIdentifiersInNew || hasNoIdentifiersInExisting) {
        return true;
      }
      return false;
    });
    return match || null;
  }

  try {
    const q = query(
      collection(db, "members"),
      where("lastName", "==", lastName.trim().toUpperCase()),
      where("firstName", "==", firstName.trim().toUpperCase()),
      limit(10)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      return null;
    }

    for (const d of snap.docs) {
      const m = { id: d.id, ...d.data() } as Member;
      
      if (birthday && m.birthday && m.birthday === birthday) return m;
      
      if (contactNumber && m.contactNumber) {
        const c1 = contactNumber.replace(/[^0-9]/g, "");
        const c2 = m.contactNumber.replace(/[^0-9]/g, "");
        if (c1 && c2 && c1 === c2) return m;
      }
      
      if (email && m.email && email.trim().toUpperCase() === m.email.trim().toUpperCase()) return m;

      const hasNoIdentifiersInNew = !birthday && !contactNumber && !email;
      const hasNoIdentifiersInExisting = !m.birthday && !m.contactNumber && !m.email;
      if (hasNoIdentifiersInNew || hasNoIdentifiersInExisting) {
        return m;
      }
    }
    return null;
  } catch (error) {
    console.error("Duplicate check error:", error);
    return null;
  }
};

export const createMember = async (memberData: Omit<Member, "id" | "createdAt" | "updatedAt">) => {
  if (isSandboxActive()) {
    const data = getSandboxData("scoc_members", INITIAL_MOCK_MEMBERS);
    const newMember: Member = {
      id: `mock_${Date.now()}`,
      ...memberData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...data, newMember];
    saveSandboxData("scoc_members", updated);
    
    // Auto add log
    await createAuditLog({
      userEmail: "scoc2911@gmail.com",
      userName: "SCOC Sandbox Admin",
      action: `Created Member Profile for ${memberData.firstName} ${memberData.lastName}`,
    });

    notifyMembers();
    return;
  }

  try {
    const finalMemberData = {
      ...memberData,
      email: memberData.email ? memberData.email.toLowerCase().trim() : "",
    };
    const sanitized = sanitizeData(finalMemberData);
    const newDocRef = doc(collection(db, "members"));
    await setDoc(newDocRef, {
      ...sanitized,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "members");
  }
};

export const updateMember = async (id: string, memberData: Partial<Member>) => {
  if (isSandboxActive()) {
    const data = getSandboxData("scoc_members", INITIAL_MOCK_MEMBERS);
    const updated = data.map((m) => {
      if (m.id === id) {
        return {
          ...m,
          ...memberData,
          updatedAt: new Date().toISOString(),
        };
      }
      return m;
    });
    saveSandboxData("scoc_members", updated);

    // Auto add log
    await createAuditLog({
      userEmail: "scoc2911@gmail.com",
      userName: "SCOC Sandbox Admin",
      action: `Updated Member Profile ID: ${id}`,
    });

    notifyMembers();
    return;
  }

  try {
    const memberDoc = doc(db, "members", id);
    // Exclude id and createdAt from update
    const { id: _, createdAt, ...updateData } = memberData;
    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase().trim();
    }
    const sanitized = sanitizeData(updateData);
    await setDoc(
      memberDoc,
      {
        ...sanitized,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `members/${id}`);
  }
};

export const deleteMember = async (id: string) => {
  if (isSandboxActive()) {
    const data = getSandboxData("scoc_members", INITIAL_MOCK_MEMBERS);
    const updated = data.filter((m) => m.id !== id);
    saveSandboxData("scoc_members", updated);

    // Auto add log
    await createAuditLog({
      userEmail: "scoc2911@gmail.com",
      userName: "SCOC Sandbox Admin",
      action: `Permanently deleted Member Record ID: ${id}`,
    });

    notifyMembers();
    return;
  }

  try {
    await deleteDoc(doc(db, "members", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `members/${id}`);
  }
};

export interface Network {
  id?: string;
  networkName: string;
  networkLeader: string;
  createdAt?: string;
  updatedAt?: string;
}

export const subscribeToNetworks = (callback: (networks: Network[]) => void) => {
  if (isSandboxActive()) {
    networksCallbacks.push(callback);
    callback(getSandboxData("scoc_networks", INITIAL_MOCK_NETWORKS));
    return () => {
      networksCallbacks = networksCallbacks.filter((cb) => cb !== callback);
    };
  }

  const q = query(collection(db, "networks"));
  return onSnapshot(
    q,
    (snapshot) => {
      const networks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...serializeDoc(doc.data()),
      })) as Network[];
      callback(networks);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, "networks");
    }
  );
};

export const createNetwork = async (networkData: Omit<Network, "id" | "createdAt" | "updatedAt">) => {
  if (isSandboxActive()) {
    const data = getSandboxData("scoc_networks", INITIAL_MOCK_NETWORKS);
    const newNetwork: Network = {
      id: `net_${Date.now()}`,
      ...networkData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...data, newNetwork];
    saveSandboxData("scoc_networks", updated);

    notifyNetworks();
    return;
  }

  try {
    const sanitized = sanitizeData(networkData);
    const newDocRef = doc(collection(db, "networks"));
    await setDoc(newDocRef, {
      ...sanitized,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "networks");
  }
};

export const updateNetwork = async (id: string, networkData: Partial<Network>) => {
  if (isSandboxActive()) {
    const data = getSandboxData("scoc_networks", INITIAL_MOCK_NETWORKS);
    const updated = data.map((n) => {
      if (n.id === id) {
        return {
          ...n,
          ...networkData,
          updatedAt: new Date().toISOString(),
        };
      }
      return n;
    });
    saveSandboxData("scoc_networks", updated);

    notifyNetworks();
    return;
  }

  try {
    const networkDoc = doc(db, "networks", id);
    const { id: _, createdAt, ...updateData } = networkData;
    const sanitized = sanitizeData(updateData);
    await setDoc(
      networkDoc,
      {
        ...sanitized,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `networks/${id}`);
  }
};

export const deleteNetwork = async (id: string) => {
  if (isSandboxActive()) {
    const data = getSandboxData("scoc_networks", INITIAL_MOCK_NETWORKS);
    const updated = data.filter((n) => n.id !== id);
    saveSandboxData("scoc_networks", updated);

    notifyNetworks();
    return;
  }

  try {
    await deleteDoc(doc(db, "networks", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `networks/${id}`);
  }
};

export interface Ministry {
  id?: string;
  ministryName: string;
  ministryHead: string;
  createdAt?: string;
  updatedAt?: string;
}

export const subscribeToMinistries = (callback: (ministries: Ministry[]) => void) => {
  if (isSandboxActive()) {
    ministriesCallbacks.push(callback);
    callback(getSandboxData("scoc_ministries", INITIAL_MOCK_MINISTRIES));
    return () => {
      ministriesCallbacks = ministriesCallbacks.filter((cb) => cb !== callback);
    };
  }

  const q = query(collection(db, "ministries"));
  return onSnapshot(
    q,
    (snapshot) => {
      const ministries = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...serializeDoc(doc.data()),
      })) as Ministry[];
      callback(ministries);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, "ministries");
    }
  );
};

export const createMinistry = async (ministryData: Omit<Ministry, "id" | "createdAt" | "updatedAt">) => {
  if (isSandboxActive()) {
    const data = getSandboxData("scoc_ministries", INITIAL_MOCK_MINISTRIES);
    const newMinistry: Ministry = {
      id: `min_${Date.now()}`,
      ...ministryData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...data, newMinistry];
    saveSandboxData("scoc_ministries", updated);

    notifyMinistries();
    return;
  }

  try {
    const sanitized = sanitizeData(ministryData);
    const newDocRef = doc(collection(db, "ministries"));
    await setDoc(newDocRef, {
      ...sanitized,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "ministries");
  }
};

export const updateMinistry = async (id: string, ministryData: Partial<Ministry>) => {
  if (isSandboxActive()) {
    const data = getSandboxData("scoc_ministries", INITIAL_MOCK_MINISTRIES);
    const updated = data.map((m) => {
      if (m.id === id) {
        return {
          ...m,
          ...ministryData,
          updatedAt: new Date().toISOString(),
        };
      }
      return m;
    });
    saveSandboxData("scoc_ministries", updated);

    notifyMinistries();
    return;
  }

  try {
    const ministryDoc = doc(db, "ministries", id);
    const { id: _, createdAt, ...updateData } = ministryData;
    const sanitized = sanitizeData(updateData);
    await setDoc(
      ministryDoc,
      {
        ...sanitized,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `ministries/${id}`);
  }
};

export const deleteMinistry = async (id: string) => {
  if (isSandboxActive()) {
    const data = getSandboxData("scoc_ministries", INITIAL_MOCK_MINISTRIES);
    const updated = data.filter((m) => m.id !== id);
    saveSandboxData("scoc_ministries", updated);

    notifyMinistries();
    return;
  }

  try {
    await deleteDoc(doc(db, "ministries", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `ministries/${id}`);
  }
};

export interface ChurchEvent {
  id?: string;
  eventName: string;
  eventDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export const subscribeToEvents = (callback: (events: ChurchEvent[]) => void) => {
  if (isSandboxActive()) {
    eventsCallbacks.push(callback);
    const rawData = getSandboxData("scoc_events", INITIAL_MOCK_EVENTS);
    const sorted = [...rawData].sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
    callback(sorted);
    return () => {
      eventsCallbacks = eventsCallbacks.filter((cb) => cb !== callback);
    };
  }

  const q = query(collection(db, "events"));
  return onSnapshot(
    q,
    (snapshot) => {
      const events = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...serializeDoc(doc.data()),
      })) as ChurchEvent[];
      // Sort by soonest approaching
      events.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
      callback(events);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, "events");
    }
  );
};

export const createEvent = async (eventData: Omit<ChurchEvent, "id" | "createdAt" | "updatedAt">) => {
  if (isSandboxActive()) {
    const data = getSandboxData("scoc_events", INITIAL_MOCK_EVENTS);
    const newEvent: ChurchEvent = {
      id: `evt_${Date.now()}`,
      ...eventData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...data, newEvent];
    saveSandboxData("scoc_events", updated);

    notifyEvents();
    return;
  }

  try {
    const sanitized = sanitizeData(eventData);
    const newDocRef = doc(collection(db, "events"));
    await setDoc(newDocRef, {
      ...sanitized,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "events");
  }
};

export const updateEvent = async (id: string, eventData: Partial<ChurchEvent>) => {
  if (isSandboxActive()) {
    const data = getSandboxData("scoc_events", INITIAL_MOCK_EVENTS);
    const updated = data.map((e) => {
      if (e.id === id) {
        return {
          ...e,
          ...eventData,
          updatedAt: new Date().toISOString(),
        };
      }
      return e;
    });
    saveSandboxData("scoc_events", updated);

    notifyEvents();
    return;
  }

  try {
    const eventDoc = doc(db, "events", id);
    const { id: _, createdAt, ...updateData } = eventData;
    const sanitized = sanitizeData(updateData);
    await setDoc(
      eventDoc,
      {
        ...sanitized,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `events/${id}`);
  }
};

export const deleteEvent = async (id: string) => {
  if (isSandboxActive()) {
    const data = getSandboxData("scoc_events", INITIAL_MOCK_EVENTS);
    const updated = data.filter((e) => e.id !== id);
    saveSandboxData("scoc_events", updated);

    notifyEvents();
    return;
  }

  try {
    await deleteDoc(doc(db, "events", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `events/${id}`);
  }
};

// ----------------------------------------------------
// ATTENDANCE TRACKING
// ----------------------------------------------------
export interface AttendanceRecord {
  id?: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  memberId: string;
  memberName: string;
  status: "Present" | "Absent";
  updatedAt?: any;
}

export const subscribeToAttendance = (eventId: string, callback: (records: AttendanceRecord[]) => void) => {
  if (isSandboxActive()) {
    if (!attendanceCallbacks[eventId]) {
      attendanceCallbacks[eventId] = [];
    }
    attendanceCallbacks[eventId].push(callback);
    
    const data = getSandboxData("scoc_attendance", INITIAL_MOCK_ATTENDANCE);
    const filtered = data.filter((r) => r.eventId === eventId);
    callback(filtered);
    return () => {
      attendanceCallbacks[eventId] = (attendanceCallbacks[eventId] || []).filter((cb) => cb !== callback);
    };
  }

  const q = query(collection(db, "attendance"));
  return onSnapshot(
    q,
    (snapshot) => {
      const records = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...serializeDoc(doc.data()),
        })) as AttendanceRecord[];
      // Filter in-memory for accuracy and ease of indexing
      const filtered = records.filter(r => r.eventId === eventId);
      callback(filtered);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `attendance?eventId=${eventId}`);
    }
  );
};

export const saveAttendanceBatch = async (records: Omit<AttendanceRecord, "id" | "updatedAt">[]) => {
  if (isSandboxActive()) {
    const data = getSandboxData("scoc_attendance", INITIAL_MOCK_ATTENDANCE);
    const nextAttendance = [...data];

    records.forEach((rec) => {
      const docKey = `${rec.eventId}_${rec.memberId}`;
      const existingIdx = nextAttendance.findIndex((r) => r.eventId === rec.eventId && r.memberId === rec.memberId);
      
      const updatedRecord = {
        id: docKey,
        ...rec,
        updatedAt: new Date().toISOString(),
      };

      if (existingIdx !== -1) {
        nextAttendance[existingIdx] = updatedRecord;
      } else {
        nextAttendance.push(updatedRecord);
      }
    });

    saveSandboxData("scoc_attendance", nextAttendance);

    // Notify any screen listening to this event's attendance
    if (records.length > 0) {
      notifyAttendance(records[0].eventId);
    }
    return;
  }

  try {
    const promises = records.map(async (rec) => {
      // Use unique key: eventId_memberId to avoid duplicate rows in attendance tracking
      const docKey = `${rec.eventId}_${rec.memberId}`;
      const docRef = doc(db, "attendance", docKey);
      await setDoc(
        docRef,
        {
          ...sanitizeData(rec),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    });
    await Promise.all(promises);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "attendance-batch");
  }
};

// ----------------------------------------------------
// AUDIT LOGS & TRAILS
// ----------------------------------------------------
export interface AuditLog {
  id?: string;
  userEmail: string;
  userName: string;
  action: string;
  timestamp?: any;
}

export const createAuditLog = async (logData: Omit<AuditLog, "id" | "timestamp">) => {
  if (isSandboxActive()) {
    const data = getSandboxData("scoc_auditLogs", INITIAL_MOCK_AUDIT_LOGS);
    const newLog = {
      id: `log_${Date.now()}`,
      ...logData,
      timestamp: new Date().toISOString(),
    };
    const updated = [newLog, ...data];
    saveSandboxData("scoc_auditLogs", updated);
    
    notifyAuditLogs();
    return;
  }

  try {
    const newDocRef = doc(collection(db, "auditLogs"));
    await setDoc(newDocRef, {
      ...sanitizeData(logData),
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
};

export const subscribeToAuditLogs = (callback: (logs: AuditLog[]) => void) => {
  if (isSandboxActive()) {
    auditLogsCallbacks.push(callback);
    const data = getSandboxData("scoc_auditLogs", INITIAL_MOCK_AUDIT_LOGS);
    callback(data);
    return () => {
      auditLogsCallbacks = auditLogsCallbacks.filter((cb) => cb !== callback);
    };
  }

  const q = query(collection(db, "auditLogs"));
  return onSnapshot(
    q,
    (snapshot) => {
      const logs = snapshot.docs.map((doc) => {
        const data = serializeDoc(doc.data());
        let timestampStr = "—";
        if (data.timestamp) {
          timestampStr = new Date(data.timestamp).toLocaleString();
        }
        return {
          id: doc.id,
          ...data,
          formattedTimestamp: timestampStr,
        } as AuditLog & { formattedTimestamp: string };
      });
      // Sort logs by newest first
      logs.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });
      callback(logs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, "auditLogs");
    }
  );
};

// ----------------------------------------------------
// SYSTEM USER ROLES & PERMISSIONS
// ----------------------------------------------------
export interface SystemUserRole {
  id?: string; // will store the user authenticated UUID or email
  email: string;
  displayName: string;
  role: "admin" | "viewer";
  updatedAt?: any;
}

export const subscribeToUserRoles = (callback: (roles: SystemUserRole[]) => void) => {
  if (isSandboxActive()) {
    userRolesCallbacks.push(callback);
    callback(getSandboxData("scoc_userRoles", INITIAL_MOCK_USER_ROLES));
    return () => {
      userRolesCallbacks = userRolesCallbacks.filter((cb) => cb !== callback);
    };
  }

  const q = query(collection(db, "userRoles"));
  return onSnapshot(
    q,
    (snapshot) => {
      const userRoles = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...serializeDoc(doc.data()),
      })) as SystemUserRole[];
      callback(userRoles);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, "userRoles");
    }
  );
};

export const updateUserRole = async (email: string, role: "admin" | "viewer") => {
  if (isSandboxActive()) {
    const data = getSandboxData("scoc_userRoles", INITIAL_MOCK_USER_ROLES);
    const safeKey = email.toLowerCase().replace(/[^a-z0-9]/g, "_");
    
    const existingIdx = data.findIndex((u) => u.email === email.toLowerCase());
    
    const updatedRole: SystemUserRole = {
      id: safeKey,
      email: email.toLowerCase(),
      displayName: email.split("@")[0].toUpperCase(),
      role,
      updatedAt: new Date().toISOString(),
    };

    const nextRoles = [...data];
    if (existingIdx !== -1) {
      nextRoles[existingIdx] = updatedRole;
    } else {
      nextRoles.push(updatedRole);
    }

    saveSandboxData("scoc_userRoles", nextRoles);
    notifyUserRoles();
    return;
  }

  try {
    // We sanitize Email to use as a Firestore key so we don't duplicate records
    const safeKey = email.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const roleDocRef = doc(db, "userRoles", safeKey);
    await setDoc(
      roleDocRef,
      {
        email: email.toLowerCase(),
        role,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `userRoles/${email}`);
  }
};

export const deleteUserRole = async (email: string) => {
  if (isSandboxActive()) {
    const data = getSandboxData("scoc_userRoles", INITIAL_MOCK_USER_ROLES);
    const updated = data.filter((u) => u.email !== email.toLowerCase());
    saveSandboxData("scoc_userRoles", updated);
    notifyUserRoles();
    return;
  }

  try {
    const safeKey = email.toLowerCase().replace(/[^a-z0-9]/g, "_");
    await deleteDoc(doc(db, "userRoles", safeKey));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `userRoles/${email}`);
  }
};

