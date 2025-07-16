import { Task } from '../models/task';

export class TaskService {
    dueIn = (task: Task): number => {
        if (!task.dueDate) {
            return 0;
        }

        const now = new Date();
        const dueDate = new Date(task.dueDate);
        const diff = dueDate.getTime() - now.getTime();

        return Math.ceil(diff / (1000 * 60 * 60 * 24)); // Convert milliseconds to days
    };

    prioritySort = (a: Task, b: Task): number => {
        return (b.priority - a.priority) * 1e6 + (this.dueIn(a) - this.dueIn(b)) * 1e5 + (a.id - b.id);
    };

    dueSort = (a: Task, b: Task): number => {
        return (this.dueIn(a) - this.dueIn(b));
    };
}