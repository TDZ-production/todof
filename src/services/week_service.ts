import { Task } from '../models/task';
import { Week } from '../models/week';

export class WeekService {
    constructor(private API: string) {

    }

    async setTaskDone(task: Task, done: boolean): Promise<boolean> {

        const result = await fetch(`${this.API}${task.id}/done`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ done })
        })
            .then((response) => {
                if (!response.ok) {
                    console.error('Failed to update task', response);
                    throw new Error('Failed to update task');
                }
                return true;
            })
            .catch((error) => {
                console.error('Failed to update task', error);
                return false;
            });

        if (!result) {
            return false;
        }

        if (done) {
            task.doneAt = new Date();
        } else {
            task.doneAt = null;
        }

        return true;
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

        if (!response.ok) {
            console.error('Failed to create task', response);
            throw new Error('Failed to create task');
        }

        const id = await response.json();

        return { id, ...task, doneAt: null, createdAt: new Date() };
    }

    async fetch(): Promise<Week> {
        const response = await fetch(this.API, {
            credentials: 'include'
        });
        const raw = await response.text();
        const data = JSON.parse(raw, (key, value) => {
            if (value !== null && (key === 'createdAt' || key === 'dueDate' || key === 'doneAt')) {
                return new Date(value);
            }
            return value;
        });
        return data;
    }

}