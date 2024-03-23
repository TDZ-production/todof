import { Task } from "./models/task";
import { Week } from "./models/week";
import { WeekService } from "./services/week_service";

export class AppController {
    private week: Promise<Week>;
    private tasksList: HTMLElement;

    constructor(private weekService: WeekService, private root: HTMLElement, private template: HTMLTemplateElement) {
        this.tasksList = this.root.querySelector('main')!;

        this.week = this.weekService.fetch()
            .catch((error) => {
                console.error(error);
                throw new Error('Failed to fetch data');
            });
    }

    render(tasks: Task[]) {
        this.tasksList.innerHTML = '';

        tasks.forEach(task => {
            const df = this.template.content.cloneNode(true) as DocumentFragment;
            const t = df.querySelector('.task')!;

            t.querySelector('p')!.innerText = task.description;
            t.querySelector('input')!.checked = task.doneAt !== null;
            t.querySelector<HTMLElement>('span.priority')!.classList.add(`prio${task.priority}`);
            if (task.dueDate) {
                t.querySelector<HTMLElement>('span.due')!.innerText = task.dueDate;
            }

            this.tasksList.appendChild(t);
        });

    }


    async index() {
        const week = await this.week;


        const weekNumber = this.root.querySelector('h2')!;
        if (!this.week) {
            weekNumber.innerText = 'No data :skull:';
            return;
        }
        weekNumber.innerText = `Week ${week.number}`;


        this.render(week.tasks.reverse());

        this.root.querySelectorAll<HTMLElement>('.filters button').forEach((button) => {
            button.addEventListener('click', () => {
                this.filter(button.dataset.filter);
            });
        });
    }

    async filter(what?: string) {
        const week = await this.week;
        let tasks = [...week.tasks];

        if (what === 'priority') {
            tasks = tasks.sort((b, a) => (a.priority - b.priority) * 10e6 + (a.id - b.id));
        } else if (what === 'due') {
            tasks = tasks.filter(task => task.dueDate !== null).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
        } else if (what === 'notes') {
            tasks = tasks.filter(task => task.priority === 1);
        }

        this.render(tasks);
    }
}