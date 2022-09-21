import Construction from './construction';
import timeBonus from '../static/timeBonus';
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
        return Math.floor(this.describe.time * timeBonus(sfLevel) / this.speed)
    }
}