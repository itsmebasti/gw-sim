import Construction from './construction';
import { FACTORY } from '../static/types';

export default class Building extends Construction {
    
    constructor(describes, level, speed) {
        super(describes, FACTORY.KZ, speed, level);
    }
    
    // Note: only valid for mines
    hourlyProduction() {
        const base = (this.level > 0 ? (this.describe.prod[6][0]*this.speed/6) : 0);
        const prod = this.describe.prod[6][this.level]*this.speed/6;
        
        return base + prod;
    }
    
    hourlyConsumption() {
        return this.describe.consumption[6][this.level]*this.speed/6;
    }
}