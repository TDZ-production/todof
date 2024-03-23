import { Week } from '../models/week';

export class WeekService {
    constructor(private API: string) {

    }

    async fetch(): Promise<Week> {
        const response = await fetch(this.API, {
            credentials: 'include'
        });
        const data = await response.json();
        return data;
    }

}