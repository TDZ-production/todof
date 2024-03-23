import './new.css'

import { Week } from './models/week';
import { WeekService } from './services/week_service';

const API = 'http://localhost:8080/api/0/';

appController(new WeekService(API), document.body, document.querySelector('template')!);

function appController(weekService: WeekService, root: HTMLElement, template: HTMLTemplateElement) {

  const tasksList = root.querySelector('main')!;

  weekService.fetch().then((week: Week) => {
    render(week);
  });


  function render(week: Week) {

    const weekNumber = root.querySelector('h2')!;
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
}