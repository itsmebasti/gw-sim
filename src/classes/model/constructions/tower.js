import Construction from './construction';
import { timeBonus } from '../static/formulas';
import { FACTORY } from '../static/types';

export default class Tower extends Construction {
    constructor(describe, level, speed) {
        super(describe, FACTORY.VS, speed, level);
    }
    
    requiredStorage() {
        return [];
    }
    
    increaseCost(resType) {
        return this.describe[resType];
    }
    
    increaseSeconds(orbiLevel) {
        return this.describe.seconds * timeBonus(orbiLevel) / this.speed;
    }
}