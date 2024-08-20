import ResourceStorage from './resourceStorage';
import ResourceChanges from './resourceChanges';
import { RES, NAMES, CHANGE } from '../static/types';

export default class ResourceCenter {
    feStorage;
    lutStorage;
    h2oStorage;
    h2Storage;
    
    constructor(feMine, luMine, tower, chem, echem, resources) {
        this.feStorage = new ResourceStorage(RES.FE, resources, feMine);
        this.lutStorage = new ResourceStorage(RES.LUT, resources, luMine);
        this.h2oStorage = new ResourceStorage(RES.H2O, resources, tower);
        this.h2Storage = new ResourceStorage(RES.H2, resources, new H2Factory(chem, echem));
    }
    
    apply(resourceChanges) {
        resourceChanges.values.forEach((change) => this.storage(change.type).apply(change));
    }
    
    timeToProduce(feAmount, lutAmount, h2oAmount, h2Amount) {
        const feTime = this.feStorage.secondsToProduce(feAmount);
        const lutTime = this.lutStorage.secondsToProduce(lutAmount);
        
        const hourlyH2oConsumption = this.h2Storage.mine.hourlyConsumption();
        const hourlyH2oProduction = this.h2oStorage.mine.hourlyProduction();
        
        let h2oTime = this.h2oStorage.secondsToProduce(h2oAmount, {hourlyH2oConsumption});
        let h2Time = 0;
        
        if(h2Amount > 0) {
            h2Time = this.h2Storage.secondsToProduce(h2Amount);
            
            if(h2Time === Infinity) {
                return Infinity;
            }
            
            const consumption = this.h2Storage.consumptionIn(h2Time);
            const water = this.h2oStorage.resourcesIn(h2Time);
            
            if(consumption > water) {
                const secondsToConsumeAll = this.h2oStorage.secondsToConsumeAll(hourlyH2oConsumption);
                
                const rest = h2Amount - this.h2Storage.productionIn(secondsToConsumeAll);
                
                h2Time = secondsToConsumeAll + this.h2Storage.secondsToProduce(rest, {hourlyH2oProduction});
            }
        }
        
        const seconds = Math.ceil(Math.max(feTime, lutTime, h2oTime, h2Time));
        
        if(hourlyH2oProduction < 0 && this.h2oStorage.resourcesIn(seconds, hourlyH2oConsumption) < h2oAmount) {
            return Infinity;
        }
        
        return seconds;
    }
    
    secondsTillWaterIsEmpty() {
        return this.h2oStorage.secondsToConsumeAll(this.h2Storage.mine.hourlyConsumption());
    }
    
    produceIntoStorage(duration) {
        let h2oProduction = this.h2oStorage.productionIn(duration);
        let h2Production = 0;
        
        const water = this.h2oStorage.resourcesIn(duration);
        const consumption = this.h2Storage.consumptionIn(duration);
        
        if(consumption > water) {
            h2oProduction = -this.h2oStorage.stored;
            h2Production += this.h2Storage.productionIn(duration) * (water/consumption);
        }
        else {
            h2oProduction -= consumption;
            h2Production += this.h2Storage.productionIn(duration);
        }
        
        this.apply(new ResourceChanges(
            this.feStorage.productionIn(duration),
            this.lutStorage.productionIn(duration),
            h2oProduction,
            h2Production,
            CHANGE.PRODUCED));
    }
    
    storage(type) {
        switch (type) {
            case RES.FE: return this.feStorage;
            case RES.LUT: return this.lutStorage;
            case RES.H2O: return this.h2oStorage;
            case RES.H2: return this.h2Storage;
        }
    }
    
    get printable() {
        return [this.feStorage, this.lutStorage, this.h2oStorage, this.h2Storage].map((storage) => {
            const consumption = (storage === this.h2oStorage) ? this.h2Storage.mine.hourlyConsumption() : 0;
            return {
                name: NAMES[storage.resType],
                type: storage.resType,
                stored: Math.floor(storage.stored).toLocaleString('de-DE'),
                hourlyProduction: Math.floor(storage.productionIn(3600, consumption)).toLocaleString('de-DE')
            }
        });
    }
    
    get state() {
        return [this.feStorage, this.lutStorage, this.h2oStorage, this.h2Storage].map(
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