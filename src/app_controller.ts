import { Task } from "./models/task";
import { Week } from "./models/week";
import { WeekService } from "./services/week_service";

export class AppController {
    private week: Promise<Week>;
    private tasksList: HTMLElement;
    private footer: HTMLElement;
    private form: HTMLFormElement;
    private submitAction: () => Promise<void>;

    constructor(private weekService: WeekService, private root: HTMLElement, private template: HTMLTemplateElement) {
        this.tasksList = this.root.querySelector('main')!;
        this.footer = this.root.querySelector('footer')!;
        this.form = this.root.querySelector('footer form')!;
        this.submitAction = this.createTask;

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


        this.rerender();

        this.form.onsubmit = this.submitForm;

        const description = this.form.querySelector<HTMLTextAreaElement>('[name="description"]')!;
        description.addEventListener('input', () => {
            this.footer.classList.toggle('valid', description.checkValidity());
        });

        let enterKeyCount = 0;
        let lastEnterIndex = -1;

        description.addEventListener('keydown', (event) => {
            if (event.key === 'Process') return;
            if (event.key === 'Enter') {
                const currentEnterIndex = description.selectionStart;
                if (lastEnterIndex === -1 || currentEnterIndex === lastEnterIndex + 1) {
                    enterKeyCount++;
                    lastEnterIndex = currentEnterIndex;
                } else {
                    enterKeyCount = 1;
                    lastEnterIndex = currentEnterIndex;
                }

                if (enterKeyCount === 3) {
                    event.preventDefault();
                    description.value = description.value.substring(0, lastEnterIndex - 2) + description.value.substring(lastEnterIndex);
                    this.submitForm();
                    enterKeyCount = 0;
                    lastEnterIndex = -1;
                }
            } else {
                enterKeyCount = 0;
                lastEnterIndex = -1;
            }
        });


        // autosize the textarea so it doesn't scroll
        description.addEventListener('input', () => {
            description.style.height = 'auto';
            description.style.height = `${description.scrollHeight}px`;
        });

        const priority = this.root.querySelector<HTMLInputElement>('footer [name="priority"]')!;
        const priorities = this.root.querySelectorAll<HTMLInputElement>('.priorities button');
        priority.onchange = () => {
            priorities.forEach(b => b.classList.remove('active'));
            priorities[Number(priority.value) - 1]?.classList.add('active');
        }
        priorities.forEach((button) => {
            button.addEventListener('click', () => {
                priority.value = button.dataset.priority!;
                priority.dispatchEvent(new Event("change"));

                this.submitForm();
            });
        });

        let currentFilter = this.root.querySelector<HTMLInputElement>('.filters button.active')?.dataset.filter || 'all';
        const filters = this.root.querySelectorAll<HTMLElement>('.filters button');
        filters.forEach(button => {
            button.addEventListener('click', () => {
                let filter = button.dataset.filter!;
                filters.forEach(b => b.classList.remove('active'));
                button.classList.add('active');

                if (filter === 'all' && filter === currentFilter) {
                    filter = "not-done";
                } else if (filter === currentFilter) {
                    return;
                }

                currentFilter = filter;
                this.filter(week, filter);
            });
        });
    }

    private async createTask() {
        const task = await this.weekService.createTask(new FormData(this.form));

        (await this.week).tasks.unshift(task);

        this.rerender();
    }

    private submitForm(event?: Event) {
        if (event) event.preventDefault();

        this.submitAction();

        this.resetForm();
    }

    private resetForm() {
        const description = this.form.querySelector<HTMLInputElement | HTMLTextAreaElement>('[name="description"]')!;
        description.value = '';
        description.dispatchEvent(new Event('input'));
    }

    private async putTask(task: Task) {
        this.weekService.putTask(task, new FormData(this.form));

        return this.rerender();
    }


    private async filter(week: Week, what?: string) {
        let tasks = [...week.tasks];

        if (what !== 'all' && what !== undefined) {
            tasks = tasks.filter(task => task.doneAt === null);
        }

        if (what === 'priority') {
            tasks = tasks.filter(task => task.priority > 1).sort((b, a) => (a.priority - b.priority) * 10e6 + (b.id - a.id));
        } else if (what === 'due') {
            tasks = tasks.filter(task => task.dueDate !== null).sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime());
        } else if (what === 'notes') {
            tasks = tasks.filter(task => task.priority === 1);
        }

        this.render(...tasks);
    }

    private async editTask(task: Task) {
        const description = this.form.querySelector<HTMLInputElement | HTMLTextAreaElement>('[name="description"]')!;
        const priority = this.root.querySelector<HTMLInputElement>('footer [name="priority"]')!;

        description.value = task.description;
        description.dispatchEvent(new Event('input'));

        priority.value = task.priority.toString();
        priority.dispatchEvent(new Event("change"));

        this.submitAction = () => this.putTask(task);
    }

    private async rerender() {
        const week = await this.week;

        this.render(...week.tasks);
    }

    private render(...tasks: Task[]) {
        this.tasksList.innerHTML = '';
        
        const result: HTMLElement[] = tasks.map(task => {
            const df = this.template.content.cloneNode(true) as DocumentFragment;
            const t = df.querySelector<HTMLElement>('.task')!;

            t.querySelector('p')!.innerText = task.description;
            t.querySelector('input')!.checked = task.doneAt !== null;
            t.querySelector<HTMLElement>('span.priority')!.classList.add(`prio${task.priority}`);
            if (task.dueDate) {
                // set it to the day of the week, in short form
                t.querySelector<HTMLElement>('span.due')!.innerText = task.dueDate.toLocaleDateString('en', { weekday: 'short' });
            }

            t.onclick = () => {
                this.editTask(task);
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

            return t;
        });

        this.tasksList.append(...result);

        return result;
    }
}