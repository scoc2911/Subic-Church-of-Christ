import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  onSnapshot,
  serverTimestamp,
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

export const subscribeToMembers = (callback: (members: Member[]) => void) => {
  const q = query(collection(db, "members"));
  return onSnapshot(
    q,
    (snapshot) => {
      const members = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Member[];
      callback(members);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, "members");
    }
  );
};

export const createMember = async (memberData: Omit<Member, "id" | "createdAt" | "updatedAt">) => {
  try {
    const sanitized = sanitizeData(memberData);
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
  try {
    const memberDoc = doc(db, "members", id);
    // Exclude id and createdAt from update
    const { id: _, createdAt, ...updateData } = memberData;
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
  const q = query(collection(db, "networks"));
  return onSnapshot(
    q,
    (snapshot) => {
      const networks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Network[];
      callback(networks);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, "networks");
    }
  );
};

export const createNetwork = async (networkData: Omit<Network, "id" | "createdAt" | "updatedAt">) => {
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
  const q = query(collection(db, "ministries"));
  return onSnapshot(
    q,
    (snapshot) => {
      const ministries = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Ministry[];
      callback(ministries);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, "ministries");
    }
  );
};

export const createMinistry = async (ministryData: Omit<Ministry, "id" | "createdAt" | "updatedAt">) => {
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
  const q = query(collection(db, "events"));
  return onSnapshot(
    q,
    (snapshot) => {
      const events = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
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
  const q = query(collection(db, "attendance"));
  return onSnapshot(
    q,
    (snapshot) => {
      const records = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
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
  const q = query(collection(db, "auditLogs"));
  return onSnapshot(
    q,
    (snapshot) => {
      const logs = snapshot.docs.map((doc) => {
        const data = doc.data();
        let timestampStr = "—";
        if (data.timestamp) {
          const t = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
          timestampStr = t.toLocaleString();
        }
        return {
          id: doc.id,
          ...data,
          formattedTimestamp: timestampStr,
        } as AuditLog & { formattedTimestamp: string };
      });
      // Sort logs by newest first
      logs.sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
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
  const q = query(collection(db, "userRoles"));
  return onSnapshot(
    q,
    (snapshot) => {
      const userRoles = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SystemUserRole[];
      callback(userRoles);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, "userRoles");
    }
  );
};

export const updateUserRole = async (email: string, role: "admin" | "viewer") => {
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
  try {
    const safeKey = email.toLowerCase().replace(/[^a-z0-9]/g, "_");
    await deleteDoc(doc(db, "userRoles", safeKey));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `userRoles/${email}`);
  }
};

