import { Task } from "./models/task";
import { Week } from "./models/week";
import { WeekService } from "./services/week_service";

export class AppController {
    private week: Promise<Week>;
    private tasksList: HTMLElement;
    private footer: HTMLElement;
    private form: HTMLFormElement;
    private menuButton: HTMLElement;
    private submitAction: () => Promise<void>;
    private stash: [string, string] | null = null;
    private desc: HTMLTextAreaElement;
    private priority: HTMLInputElement;
    private currentFilter: string;

    constructor(private weekService: WeekService, private root: HTMLElement, private template: HTMLTemplateElement) {
        this.menuButton = this.root.querySelector('.menu')!;
        this.tasksList = this.root.querySelector('main')!;
        this.footer = this.root.querySelector('footer')!;
        this.form = this.root.querySelector('footer form')!;
        this.submitAction = this.createTask;
        this.desc = this.form.querySelector<HTMLTextAreaElement>('[name="description"]')!;
        this.priority = this.form.querySelector<HTMLInputElement>('[name="priority"]')!;
        this.currentFilter = this.root.querySelector<HTMLInputElement>('.filters button.active')?.dataset.filter || 'all';

        this.week = this.weekService.fetch()
            .catch((error) => {
                console.error(error);
                throw new Error('Failed to fetch data');
            });


        this.menuButton.onclick = () => {
            window.location.reload();
        };
    }


    async index() {
        this.popStash();

        const week = await this.week;

        const weekNumber = this.root.querySelector('h2')!;
        if (!this.week) {
            weekNumber.innerText = 'No data :skull:';
            return;
        }
        weekNumber.innerText = `Week ${week.number}`;

        // on swipe up, focus the description field
        this.tasksList.addEventListener('touchstart', (event) => {
            const touch = event.touches[0];
            let startY = touch.clientY;

            // if taskList is not scrolled to the top, bail out
            if (this.tasksList.scrollTop !== 0) {
                return;
            }

            this.tasksList.addEventListener('touchend', (event) => {
                const touch = event.changedTouches[0];
                let endY = touch.clientY;

                if (startY - endY > 100) {
                    this.desc.focus();
                }
            }, { once: true });
        });


        this.rerender();

        this.form.onsubmit = this.submitForm;

        this.desc.addEventListener('input', () => {
            this.footer.classList.toggle('valid', this.desc.checkValidity());
            fitDescriptionArea()
        });



        const fitDescriptionArea = () => {
            this.desc.style.height = 'auto';
            this.desc.style.height = `${this.desc.scrollHeight}px`;
        }
        fitDescriptionArea();

        let enterKeyCount = 0;
        let lastEnterIndex = -1;

        this.desc.addEventListener('keydown', (event) => {
            if (event.key === 'Process') return;
            if (event.key === 'Enter') {
                const currentEnterIndex = this.desc.selectionStart;
                if (lastEnterIndex === -1 || currentEnterIndex === lastEnterIndex + 1) {
                    enterKeyCount++;
                    lastEnterIndex = currentEnterIndex;
                } else {
                    enterKeyCount = 1;
                    lastEnterIndex = currentEnterIndex;
                }

                if (enterKeyCount === 3) {
                    event.preventDefault();
                    this.desc.value = this.desc.value.substring(0, lastEnterIndex - 2) + this.desc.value.substring(lastEnterIndex);
                    this.submitForm();
                    enterKeyCount = 0;
                    lastEnterIndex = -1;
                }
            } else {
                enterKeyCount = 0;
                lastEnterIndex = -1;
            }
        });

        const priorities = this.root.querySelectorAll<HTMLInputElement>('.priorities button');
        this.priority.onchange = () => {
            priorities.forEach(b => b.classList.remove('active'));
            priorities[Number(this.priority.value) - 1]?.classList.add('active');
        }
        priorities.forEach((button) => {
            button.addEventListener('click', () => {
                this.setPriority(button.dataset.priority!);

                this.submitForm();
            });
        });

        const filters = this.root.querySelectorAll<HTMLElement>('.filters button');
        filters.forEach(button => {
            button.addEventListener('click', () => {
                let filter = button.dataset.filter!;
                filters.forEach(b => b.classList.remove('active'));
                button.classList.add('active');

                if (filter === 'all' && filter === this.currentFilter) {
                    filter = "not-done";
                } else if (filter === this.currentFilter) {
                    return;
                }

                this.currentFilter = filter;
                this.filter(filter);
            });
        });
    }

    private setPriority(value: string) {
        this.priority.value = value.toString();
        this.priority.dispatchEvent(new Event("change"));
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
        this.setDescription('');

        this.tasksList.classList.remove("fade");

        this.popStash();

        this.submitAction = this.createTask;
    }

    private async putTask(task: Task) {
        this.weekService.putTask(task, new FormData(this.form));

        return this.rerender();
    }

    private async filter(what?: string) {
        const week = await this.week;
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

        this.tasksList.scrollTo({ top: 0 });
    }

    private stashForm() {
        this.stash = [this.priority.value, this.desc.value];
        localStorage.setItem('stash', JSON.stringify(this.stash));
    }

    private popStash() {
        this.stash = JSON.parse(localStorage.getItem('stash') || 'null');
        if (this.stash) {
            const [priority, description] = this.stash;
            this.stash = null;
            localStorage.removeItem('stash');

            this.setPriority(priority);
            this.setDescription(description);
        }
    }

    private setDescription(description: string) {
        this.desc.value = description;
        this.desc.dispatchEvent(new Event('input'));
    }

    private async deleteTask(task: Task) {
        const week = await this.week;

        const index = week.tasks.findIndex(t => t === task);
        if (index === -1) {
            return;
        }

        week.tasks.splice(index, 1);

        this.weekService.deleteTask(task);

        this.rerender();
    }

    private async editTask(task: Task) {
        if (this.submitAction != this.createTask) {
            return this.resetForm();
        }

        this.tasksList.classList.add("fade");

        if (this.desc.value.trim() !== '') {
            this.stashForm();
        }

        this.setDescription(task.description);
        this.desc.focus();

        this.setPriority(task.priority.toString());

        this.submitAction = () => this.putTask(task);
    }

    private async rerender() {
        this.filter(this.currentFilter);
    }

    private render(...tasks: Task[]) {
        this.tasksList.innerHTML = '';

        const result: HTMLElement[] = tasks.map(task => {
            const df = this.template.content.cloneNode(true) as DocumentFragment;
            const t = df.querySelector<HTMLElement>('.task')!;

            const p = t.querySelector('p')!
            p.innerText = task.description;
            p.onclick = () => {
                this.editTask(task);
            }

            const isDoneInput = t.querySelector('input')!;
            isDoneInput.checked = task.doneAt !== null;

            t.querySelector<HTMLElement>('.delete')!.onclick = () => {
                this.deleteTask(task);
            }

            t.querySelector<HTMLElement>('span.priority')!.classList.add(`prio${task.priority}`);

            if (task.dueDate) {
                const due = t.querySelector<HTMLElement>('span.due')!;
                if (task.dueDate.toDateString() === new Date().toDateString()) {
                    due.innerText = 'Today';

                } else if (task.dueDate.toDateString() === new Date(new Date().setDate(new Date().getDate() + 1)).toDateString()) {
                    due.innerText = 'Tomorrow';

                } else if (task.dueDate < new Date()) {
                    t.classList.add('overdue');
                    due.innerText = `${Math.floor((new Date().getTime() - task.dueDate.getTime()) / (1000 * 60 * 60 * 24))
                        } days ago`
                } else {
                    due.innerText = task.dueDate.toLocaleDateString('en', { weekday: 'short' });
                }
            }

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