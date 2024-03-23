export type Task = {
  id: number;
  description: string;
  priority: number;
  createdAt: Date;
  dueDate: Date | null;
  doneAt: Date | null;
};
