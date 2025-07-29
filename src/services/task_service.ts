import { Task } from '../models/task';

export class TaskService {
    dueIn = (task: Task): number => {
        if (!task.dueDate) {
            return 0.5; // To be sorted after today's tasks but before tomorrow's
        }

        const now = new Date();
        const dueDate = new Date(task.dueDate);
        const diff = dueDate.getTime() - now.getTime();

        return Math.floor(diff / (1000 * 60 * 60 * 24));
    };

    prioritySort = (a: Task, b: Task): number => {
        return (b.priority - a.priority) * 1e5 + (this.dueIn(a) - this.dueIn(b)) * 1e7 + (a.id - b.id);
    };

    dueSort = (a: Task, b: Task): number => {
        return (this.dueIn(a) - this.dueIn(b));
    };
}