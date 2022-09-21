import ResourceStorage from './resourceStorage';
import ResourceChanges from './resourceChanges';
import { RES, NAMES } from '../static/types';

export default class ResourceCenter {
    fe;
    lut;
    h2o;
    h2;
    
    constructor(feMine, luMine, tower, chem, echem, resources) {
        this.fe = new ResourceStorage(RES.FE, resources, feMine);
        this.lut = new ResourceStorage(RES.LUT, resources, luMine);
        this.h2o = new ResourceStorage(RES.H2O, resources, tower);
        this.h2 = new ResourceStorage(RES.H2, resources, new H2Factory(chem, echem));
    }
    
    apply(resourceChanges) {
        resourceChanges.values.forEach((change) => this[change.type].apply(change));
    }
    
    timeToProduce(fe, lut, h2o, h2) {
        const feTime = this.fe.secondsToProduce(fe);
        const lutTime = this.lut.secondsToProduce(lut);
        
        const h2oConsumption = this.h2.mine.hourlyConsumption();
        const h2oProduction = this.h2o.mine.hourlyProduction();
        
        let h2oTime = this.h2o.secondsToProduce(h2o, {h2oConsumption});
        let h2Time = 0;
        
        if(h2 > 0) {
            h2Time = this.h2.secondsToProduce(h2);
            
            if(h2Time === Infinity) {
                return Infinity;
            }
            
            const consumption = this.h2.consumptionIn(h2Time);
            const water = this.h2o.resourcesIn(h2Time);
            
            if(consumption > water) {
                const secondsToConsumeAll = this.h2o.secondsToConsumeAll(h2oConsumption);
                const rest = h2 - this.h2.productionIn(secondsToConsumeAll);
                
                h2Time = secondsToConsumeAll + this.h2.secondsToProduce(rest, {h2oProduction});
            }
        }
        
        const seconds = Math.ceil(Math.max(feTime, lutTime, h2oTime, h2Time));
        
        if(h2oProduction < 0 && this.h2o.resourcesIn(seconds, h2oConsumption) < h2o) {
            return Infinity;
        }
        
        return seconds;
    }
    
    produceIntoStorage(duration) {
        const changes = new ResourceChanges(
            this.fe.productionIn(duration),
            this.lut.productionIn(duration));
        
        let h2oChange = this.h2o.productionIn(duration);
        let h2Change = 0;
        
        const water = this.h2o.resourcesIn(duration);
        const consumption = this.h2.consumptionIn(duration);
        
        if(consumption > water) {
            h2oChange = -this.h2o.stored;
            h2Change += this.h2.productionIn(duration) * (water/consumption);
        }
        else {
            h2oChange -= consumption;
            h2Change += this.h2.productionIn(duration);
        }
        
        changes.set(RES.H2O, h2oChange);
        changes.set(RES.H2, h2Change);
        
        this.apply(changes);
    }
    
    get printable() {
        return [this.fe, this.lut, this.h2o, this.h2].map((storage) => {
            const consumption = (storage === this.h2o) ? this.h2.mine.hourlyConsumption() : 0;
            return {
                name: NAMES[storage.resType],
                type: storage.resType,
                stored: Math.floor(storage.stored).toLocaleString('de-DE'),
                hourlyProduction: Math.floor(storage.productionIn(3600, consumption)).toLocaleString('de-DE')
            }
        });
    }
    
    get state() {
        return [this.fe, this.lut, this.h2o, this.h2].map(
            (storage) => ({type: storage.resType, stored: storage.stored}));
    }
}


// INNER

class H2Factory {
    chem;
    eChem;
    
    constructor(chem, eChem) {
        this.chem = chem;
        this.eChem = eChem;
    }
    
    hourlyProduction() {
        return this.chem.hourlyProduction() + this.eChem.hourlyProduction();
    }
    
    hourlyConsumption() {
        return this.chem.hourlyConsumption() + this.eChem.hourlyConsumption();
    }
}