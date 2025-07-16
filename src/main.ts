import './new.css'

import { WeekService } from './services/week_service';
import { TaskService } from './services/task_service';
import { AppController } from './app_controller';

const API = import.meta.env.VITE_API_BASE_PATH;

const app = new AppController(new TaskService(), new WeekService(API), document.body, document.querySelector('template')!);

app.index();

