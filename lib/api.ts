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
  membershipStatus: string;
  pictures?: string[];
  network?: string;
  networkLeader?: string;
  ministry?: string;
  ministryHead?: string;
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
