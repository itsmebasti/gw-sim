import levelFactor from '../static/levelFactor.json';
import timeBonus from '../static/timeBonus';
import ResourceChanges from '../resources/resourceChanges';
import { CHANGE, RES, RESOURCES, STORAGE } from '../static/types';

export default class Construction {
    type;
    factoryType;
    level;
    describe;
    speed;
    
    constructor(describe, factoryType, speed, level = 0) {
        this.type = describe.type;
        this.factoryType = factoryType;
        this.describe = describe;
        this.level = level;
        this.speed = speed;
    }
    
    increaseLevel() {
        this.level++;
    }
    
    dependencyLevel(type) {
        return this.dependencies().find((d) => d.type === type)?.level ?? 0;
    }
    
    dependencies(level = this.level+1) {
        return [...(this.describe.dependencies || []), ...this.requiredStorage(level)];
    }
    
    requiredStorage(level) {
        return RESOURCES.map((type) => ({ type: STORAGE[type], amount: this.increaseCost(type, level)}))
                             .filter(({amount}) => amount > 150000 * this.speed)
                             .map(({type, amount}) => ({ type, level: Math.ceil(Math.sqrt( amount / (30000*this.speed) -5)) }));
    }
    
    increaseCosts() {
        return new ResourceChanges(
            this.increaseCost(RES.FE),
            this.increaseCost(RES.LUT),
            this.increaseCost(RES.H2O),
            this.increaseCost(RES.H2),
            CHANGE.COST
        );
    }
    
    increaseCost(resType, level = this.level+1) {
        return this.describe[resType] / 400 * levelFactor.values[level];
    }
    
    increaseSeconds(factoryLevel, level = this.level+1) {
        return Math.floor(this.describe.factor * levelFactor.values[level] * timeBonus(factoryLevel) / this.speed)
    }
}