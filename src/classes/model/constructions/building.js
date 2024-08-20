import Construction from './construction';
import { FACTORY } from '../static/types';

export default class Building extends Construction {
    
    constructor(describes, level, speed) {
        super(describes, FACTORY.KZ, speed, level);
    }
    
    // Note: only valid for mines
    hourlyProduction() {
        const base = (this.level > 0 ? (this.describe.prod[this.speed]?.[0] ?? this.describe.prod[5][0]*this.speed/5) : 0);
        const prod = this.describe.prod[this.speed]?.[this.level] ?? this.describe.prod[5][this.level]*this.speed/5;
        
        return base + prod;
    }
    
    hourlyConsumption() {
        return this.describe.consumption[this.speed]?.[this.level] ?? this.describe.consumption[5][this.level]*this.speed/5;
    }
}