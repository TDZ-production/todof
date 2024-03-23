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


    async index() {
        const week = await this.week;


        const weekNumber = this.root.querySelector('h2')!;
        if (!this.week) {
            weekNumber.innerText = 'No data :skull:';
            return;
        }
        weekNumber.innerText = `Week ${week.number}`;


        this.render(week.tasks.reverse());


        const form = this.root.querySelector<HTMLFormElement>('footer form')!;
        form.addEventListener('submit', async (event) => this.submitTask(week, form, event));

        const filters = this.root.querySelectorAll<HTMLElement>('.filters button');
        filters.forEach((button) => {
            button.addEventListener('click', () => {
                filters.forEach((b) => b.classList.remove('active'));
                this.filter(week, button.dataset.filter);
                button.classList.add('active');
            });
        });
    }

    private async submitTask(week: Week, form: HTMLFormElement, event: SubmitEvent) {
        event.preventDefault();

        const data = new FormData(form);

        const task = await this.weekService.createTask(data);


        form.querySelector<HTMLInputElement>('input[name="description"]')!.value = '';

        this.render([task, ...week.tasks]);
    }


    private async filter(week: Week, what?: string) {
        let tasks = [...week.tasks];

        if (what !== 'all' && what !== undefined) {
            tasks = tasks.filter(task => task.doneAt === null);
        }

        if (what === 'priority') {
            tasks = tasks.sort((b, a) => (a.priority - b.priority) * 10e6 + (a.id - b.id));
        } else if (what === 'due') {
            tasks = tasks.filter(task => task.dueDate !== null).sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime());
        } else if (what === 'notes') {
            tasks = tasks.filter(task => task.priority === 1);
        }

        this.render(tasks);
    }


    private render(tasks: Task[]) {
        this.tasksList.innerHTML = '';

        tasks.forEach(task => {
            const df = this.template.content.cloneNode(true) as DocumentFragment;
            const t = df.querySelector('.task')!;

            t.querySelector('p')!.innerText = task.description;
            t.querySelector('input')!.checked = task.doneAt !== null;
            t.querySelector<HTMLElement>('span.priority')!.classList.add(`prio${task.priority}`);
            if (task.dueDate) {
                // set it to the day of the week, in short form
                t.querySelector<HTMLElement>('span.due')!.innerText = task.dueDate.toLocaleDateString('en', { weekday: 'short' });
            }

            const isDoneInput = t.querySelector('input')!;

            if (task.priority > 1) {
                isDoneInput.addEventListener('change', async (event) => {
                    const element = event.target as HTMLInputElement

                    element.disabled = true;

                    const result = await this.weekService.setTaskDone(task, element.checked);

                    if (!result) {
                        element.checked = !element.checked;
                    }

                    element.disabled = false;
                });
            } else {
                isDoneInput.remove();
                t.querySelector('.due')!.remove();
            }

            this.tasksList.appendChild(t);
        });
    }
}