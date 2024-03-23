import './new.css'

import { Week } from './models/week';
import { WeekService } from './services/week_service';
import { AppController } from './app_controller';

const API = 'http://localhost:8080/api/0/';

const app = new AppController(new WeekService(API));

app.render(document.body, document.querySelector('template')!);

