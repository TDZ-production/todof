export type Task = {
  id: number;
  description: string;
  priority: number;
  createdAt: string;
  dueDate: string | null;
  doneAt: string | null;
};
