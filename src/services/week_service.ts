import { Week } from '../models/week';

export interface IWeekService {
    fetch(): Promise<Week>;
}

export class WeekService implements IWeekService {
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