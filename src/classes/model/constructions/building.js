import Construction from './construction';
import { FACTORY } from '../static/types';

export default class Building extends Construction {
    
    constructor(describes, level, speed) {
        super(describes, FACTORY.KZ, speed, level);
    }
    
    // Note: only valid for mines
    hourlyProduction() {
        return this.describe.prod[this.speed][this.level] + (this.level > 0 ? this.describe.prod[this.speed][0] : 0);
    }
    
    hourlyConsumption() {
        return this.describe.consumption[this.speed][this.level];
    }
}