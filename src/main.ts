import './new.css'

import { WeekService } from './services/week_service';
import { AppController } from './app_controller';

const API: string = "https://todoz.app/api/0/";import.meta.env.API_BASE_PATH;

const app = new AppController(new WeekService(API), document.body, document.querySelector('template')!);

app.index();

