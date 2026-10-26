declare global {
  namespace Express {
    interface Request {
      owner?: { shopId: string };
    }
  }
}

export {};
