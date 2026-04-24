export type Coordinator = {
  id: string;
  name: string;
  age: number;
  phone: string;
  email: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type CoordinatorFormData = Omit<Coordinator, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

export type CoordinatorUpdateData = Partial<CoordinatorFormData>;
