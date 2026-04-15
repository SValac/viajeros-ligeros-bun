export type Coordinator = {
  id: string;
  nombre: string;
  edad: number;
  telefono: string;
  email: string;
  notas?: string;
  createdAt: string;
  updatedAt: string;
};

export type CoordinatorFormData = Omit<Coordinator, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

export type CoordinatorUpdateData = Partial<CoordinatorFormData>;
