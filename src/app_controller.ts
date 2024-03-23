import { Week } from "./models/week";
import { WeekService } from "./services/week_service";

export class AppController {
    private week: Promise<Week>;

    constructor(private weekService: WeekService) {
        this.week = this.weekService.fetch()
            .catch((error) => {
                console.error(error);
                throw new Error('Failed to fetch data');
            });
    }



    async render(root: HTMLElement, template: HTMLTemplateElement) {

        const week = await this.week;
        const tasksList = root.querySelector('main')!;
        const weekNumber = root.querySelector('h2')!;

        if (!this.week) {
            weekNumber.innerText = 'No data :skull:';
            return;
        }

        weekNumber.innerText = `Week ${week.number}`;

        week.tasks.forEach(task => {
            const t = template.content.cloneNode(true).firstChild as HTMLElement;

            t.querySelector('p')!.innerText = task.description;
            t.querySelector('input')!.checked = task.doneAt !== null;
            t.querySelector<HTMLElement>('span.priority')!.classList.add(`prio${task.priority}`);
            if (task.dueDate) {
                t.querySelector<HTMLElement>('span.due')!.innerText = task.dueDate;
            }

            tasksList.appendChild(t);
        });
    }

    filter(what: string) { }
}