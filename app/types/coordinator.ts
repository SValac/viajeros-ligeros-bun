export type Coordinator = {
  id: string;
  name: string;
  age: number;
  phone: string;
  email: string;
  userId: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type CoordinatorFormData = Omit<Coordinator, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & {
  id?: string;
};

export type CoordinatorUpdateData = Partial<CoordinatorFormData>;

export type CoordinatorInviteErrorCode = |
  'missing-coordinator-id'
  | 'not-authorized'
  | 'already-invited'
  | 'missing-email'
  | 'cannot-invite-self'
  | 'email-already-registered'
  | 'unknown-error';

export class CoordinatorInviteError extends Error {
  code: CoordinatorInviteErrorCode;
  constructor(code: CoordinatorInviteErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
  }
}
