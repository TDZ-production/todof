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
                    throw new Error('Failed to update task');
                }
                return true;
            })
            .catch((error) => {
                console.error(error);
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

    private validate(data: FormData) {
        ['description', 'priority'].forEach((name) => {
            if (data.get(name) === null) {
                throw new Error(`Missing field: ${name}`);
            }
        });
    }

    async deleteTask(task: Task) {
        const response = await fetch(this.API + task.id, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to delete task');
        }

        return true;
    }

    async putTask(task: Task, data: FormData) {
        this.validate(data);

        task.description = data.get('description')!.toString();
        task.priority = Number(data.get('priority'));

        const response = await fetch(this.API + task.id, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(task)
        });

        if (!response.ok) {
            throw new Error('Failed to update task');
        }

        return task;
    }

    async createTask(data: FormData): Promise<Task> {
        this.validate(data);

        const task = {
            description: data.get('description')!.toString(),
            priority: Number(data.get('priority')),
            dueDate: data.get('dueDate') ? new Date(data.get('dueDate')!.toString()) : null
        }

        const response = await fetch(this.API, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(task)
        });

        if (!response.ok) {
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
        const week: Week = JSON.parse(raw, (key, value) => {
            if (value !== null && (key === 'createdAt' || key === 'dueDate' || key === 'doneAt')) {
                return new Date(value);
            }
            return value;
        });
        week.tasks.reverse()
        return week;
    }

}