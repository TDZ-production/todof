import './new.css'

import { WeekService } from './services/week_service';
import { AppController } from './app_controller';

const API = 'http://localhost:8080/api/0/';

const app = new AppController(new WeekService(API), document.body, document.querySelector('template')!);

app.index();

