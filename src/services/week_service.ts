import { Task } from '../models/task';
import { Week } from '../models/week';

export class WeekService {
    constructor(private API: string) {

    }

    async createTask(data: FormData): Promise<Task> {
        ['description', 'priority'].forEach((name) => {
            if (data.get(name) === null) {
                throw new Error(`Missing field: ${name}`);
            }
        });

        const task = { description: data.get('description')!.toString(), priority: Number(data.get('priority')), dueDate: null }

        const response = await fetch(this.API, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(task)
        });

        const id = await response.json();

        return { id, ...task, doneAt: null, createdAt: new Date() };
    }

    async fetch(): Promise<Week> {
        const response = await fetch(this.API, {
            credentials: 'include'
        });
        const data = await response.json();
        return data;
    }

}