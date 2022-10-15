import Construction from './construction';
import { timeBonus } from '../static/formulas';
import { FACTORY } from '../static/types';

export default class Ship extends Construction {
    constructor(describe, level, speed) {
        super(describe, FACTORY.SF, speed, level);
    }
    
    requiredStorage() {
        return [];
    }
    
    increaseCost(resType) {
        return this.describe[resType];
    }
    
    increaseSeconds(sfLevel) {
        return this.describe.seconds * timeBonus(sfLevel) / this.speed;
    }
}