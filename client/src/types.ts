export type QueueStatus = 'WAITING' | 'SERVING' | 'DONE' | 'NO_SHOW';

export type PublicQueue = {
  shop: { name: string; slug: string };
  isOpen: boolean;
  nowServing: number | null;
  waitingCount: number;
  updatedAt: string;
};

export type PublicEntry = {
  tokenNumber: number;
  status: QueueStatus;
  peopleAhead: number;
  createdAt: string;
};

export type OwnerEntry = {
  id: string;
  tokenNumber: number;
  name: string;
  phone: string;
  status: QueueStatus;
  createdAt: string;
  calledAt: string | null;
};

export type OwnerQueue = {
  shop: { name: string; slug: string; isOpen: boolean };
  serviceDate: string;
  serving: OwnerEntry | null;
  waiting: OwnerEntry[];
  updatedAt: string;
};
