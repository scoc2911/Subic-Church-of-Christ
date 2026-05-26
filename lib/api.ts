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
    const newDocRef = doc(collection(db, "members"));
    await setDoc(newDocRef, {
      ...memberData,
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
    // Exclude id from update
    const { id: _, createdAt, ...updateData } = memberData;
    await setDoc(
      memberDoc,
      {
        ...updateData,
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
    const newDocRef = doc(collection(db, "networks"));
    await setDoc(newDocRef, {
      ...networkData,
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
    await setDoc(
      networkDoc,
      {
        ...updateData,
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
    const newDocRef = doc(collection(db, "ministries"));
    await setDoc(newDocRef, {
      ...ministryData,
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
    await setDoc(
      ministryDoc,
      {
        ...updateData,
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
    const newDocRef = doc(collection(db, "events"));
    await setDoc(newDocRef, {
      ...eventData,
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
    await setDoc(
      eventDoc,
      {
        ...updateData,
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

export interface AppUser {
  id?: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: string;
  updatedAt?: string;
}

export const subscribeToUsers = (callback: (users: AppUser[]) => void) => {
  const q = query(collection(db, "users"));
  return onSnapshot(
    q,
    (snapshot) => {
      const users = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AppUser[];
      callback(users);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, "users");
    }
  );
};

export const updateUserRole = async (userId: string, newRole: string) => {
  try {
    // Authoritative role update
    await setDoc(doc(db, "userRoles", userId), { role: newRole });
    // Update users collection for display
    await setDoc(doc(db, "users", userId), { role: newRole, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `userRoles/${userId}`);
  }
};
