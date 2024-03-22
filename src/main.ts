import './style.css'

import { Week } from './models/week';
import { WeekService } from './services/week_service';

const API = 'http://localhost:8080/api/0/';

appController(new WeekService(API), document.body, document.querySelector('template')!);

function appController(weekService: WeekService, root: HTMLElement, template: HTMLTemplateElement) {
  //const clone = template.content.cloneNode(true);

  //root.appendChild(clone);

  weekService.fetch().then((week: Week) => {
    render(week);
  });


  function render(week: Week) {
    const ul = document.createElement('ul');
    root.appendChild(ul);

    week.tasks.forEach(task => {
      const li = document.createElement('li');
      li.textContent = task.description;
      ul.appendChild(li);
    });
  }
}