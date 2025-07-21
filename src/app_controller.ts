import { Task } from "./models/task";
import { Week } from "./models/week";
import { WeekService } from "./services/week_service";
import { TaskService } from "./services/task_service";

export class AppController {
    private week: Promise<Week>;
    private tasksList: HTMLElement;
    private footer: HTMLElement;
    private form: HTMLFormElement;
    private menuButton: HTMLElement;
    private submitAction: () => Promise<void>;
    private stash: [string, string, string] | null = null;
    private desc: HTMLTextAreaElement;
    private priority: HTMLInputElement;
    private dueDate: HTMLInputElement;
    private dueDateCaption: HTMLButtonElement;
    private currentFilter: string;
    private filters: HTMLElement[];
    private priorities: HTMLElement[];
    private dueDates: HTMLElement[];
    private progressbar: HTMLElement;

    constructor(private taskService: TaskService, private weekService: WeekService, private root: HTMLElement, private template: HTMLTemplateElement) {
        this.menuButton = this.root.querySelector('.menu')!;
        this.tasksList = this.root.querySelector('main')!;
        this.footer = this.root.querySelector('footer')!;
        this.form = this.root.querySelector('footer form')!;
        this.submitAction = this.createTask;
        this.desc = this.form.querySelector<HTMLTextAreaElement>('[name="description"]')!;
        this.priority = this.form.querySelector<HTMLInputElement>('[name="priority"]')!;
        this.dueDate = this.form.querySelector<HTMLInputElement>('[name="dueDate"]')!;
        this.dueDateCaption = this.root.querySelector('#dueDateCaption')!;
        this.currentFilter = this.root.querySelector<HTMLInputElement>('.filters button.active')?.dataset.filter || 'all';
        this.filters = Array.from(this.root.querySelectorAll('.filters button'));
        this.priorities = Array.from(this.root.querySelectorAll('.priorities button'));
        this.dueDates = Array.from(this.root.querySelectorAll('.due button'));
        this.progressbar = this.root.querySelector('.week-progress')!;

        this.week = this.weekService.fetch()
            .catch((error) => {
                console.error(error);
                throw new Error('Failed to fetch data');
            });


        this.menuButton.onclick = () => {
            window.location.reload();
        };

        this.updateWeekProgressbar();
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

        this.priority.onchange = () => {
            this.priorities.forEach(b => b.classList.remove('active'));
            this.priorities[Number(this.priority.value) - 1]?.classList.add('active');
        }
        this.priorities.forEach((button) => {
            button.addEventListener('click', () => {
                this.setPriority(button.dataset.priority!);

                this.submitForm();
            });
        });

        this.filters.forEach(button => {
            button.addEventListener('click', () => {
                this.setFilter(button.dataset.filter!);
            });
        });

        this.dueDates.forEach(button => {
            button.addEventListener('click', () => {
                this.setDueOn(button.dataset.due);
            });
        });

        if (!('ontouchstart' in window)) {
            this.desc.focus();
        }

        this.desc.addEventListener('input', () => {
            this.footer.classList.toggle('valid', this.desc.checkValidity());
            fitDescriptionArea()
        });

        this.dueDate.onchange = () => {
            this.setDueDateCaption(this.dueDate.valueAsDate);
        }

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
    }

    private setFilter(filter: string) {
        this.filters.forEach(b => b.classList.remove('active'));

        const button = this.filters.find(b => b.dataset.filter === filter);
        button?.classList.add('active');

        if (filter === this.currentFilter) {
            if (filter.endsWith('-ext')) {
                filter = filter.replace('-ext', '');
            } else {
                filter = filter + '-ext';
            }
        }

        this.currentFilter = filter;
        this.filter(filter);
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
        this.setDueDate(null);

        this.tasksList.classList.remove("fade");

        this.popStash();

        this.submitAction = this.createTask;
    }

    private async putTask(task: Task) {
        this.weekService.putTask(task, new FormData(this.form));

        return this.rerender();
    }

    private async filter(what: string) {
        const week = await this.week;
        let tasks = [...week.tasks];
        const extended = what.endsWith('-ext');

        if (!extended) {
            tasks = tasks.filter(task => task.doneAt === null);
        }

        if (what.startsWith('priority')) {
            tasks = tasks.filter(task => extended || task.priority > 1)
                         .sort(this.taskService.prioritySort);
        } else if (what.startsWith('due')) {
            tasks = tasks.filter(task => task.dueDate !== null)
                         .sort(this.taskService.dueSort);
        } else if (what.startsWith('notes')) {
            tasks = tasks.filter(task => task.priority === 1);
        }

        this.render(...tasks);

        this.tasksList.scrollTo({ top: 0 });
    }

    private stashForm() {
        this.stash = [this.priority.value, this.desc.value, this.dueDate.value];
        localStorage.setItem('stash', JSON.stringify(this.stash));
    }

    private popStash() {
        this.stash = JSON.parse(localStorage.getItem('stash') || 'null');
        if (this.stash) {
            const [priority, description, dueDate] = this.stash;
            this.stash = null;
            localStorage.removeItem('stash');

            this.setPriority(priority);
            this.setDescription(description);
            this.setDueDate(dueDate ? new Date(dueDate) : null);
        }
    }

    private setDescription(description: string) {
        this.desc.value = description;
        this.desc.dispatchEvent(new Event('input'));
    }

    private setPriority(value: string) {
        this.priority.value = value.toString();
        this.priority.dispatchEvent(new Event("change"));
    }

    private setDueDateCaption(dueDate: Date | null) {
        if (dueDate) {
            this.dueDateCaption.innerText = dueDate.toLocaleDateString('en', { weekday: 'short', day: 'numeric' });
            this.dueDateCaption.classList.add('active');
        } else {
            this.dueDateCaption.innerText = '📅';
            this.dueDateCaption.classList.remove('active');
        }
    }

    private setDueDate(dueDate: Date | null) {
        if (dueDate) {
            this.dueDate.valueAsDate = dueDate;
        } else {
            this.dueDate.value = '';
        }

        this.dueDate.dispatchEvent(new Event('change'));
    }

    private setDueIn(days: number) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + days);
        this.setDueDate(dueDate);
    }

    private setDueOn(due: string | undefined) {
        if (due == 'tomorrow') {
            this.setDueIn(1);
        } else if (due == 'next-week') {
            this.setDueIn(7);
        } else if (due == 'this-week') {
            const days = [3, 3, 2, 2, 2, 1, 0][new Date().getDay()];
            this.setDueIn(days);
        } else {
            this.showCalendar();
        }
    }

    private showCalendar() {
        const label = this.dueDate.parentElement as HTMLLabelElement;
        label.dispatchEvent(new Event('click'));
        if (document.activeElement !== this.dueDate) {
            this.dueDate.focus();
            this.dueDate.showPicker();
        }
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
        this.setDueDate(task.dueDate);

        this.submitAction = () => this.putTask(task);
    }

    private async rerender() {
        this.filter(this.currentFilter);
    }

    private updateWeekProgressbar() {
        const now = new Date();
        const weekProgress = now.getDay() === 0 ? 100 : ((now.getDay() - 1) / 6 + now.getHours() / 24 / 6) * 100;

        if (weekProgress === 100) {
            this.progressbar.classList.add("sunday");
        }

        this.progressbar.style.width = weekProgress + "%";
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
                    due.innerText = `due in ${(this.taskService.dueIn(task)-1)} days`
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