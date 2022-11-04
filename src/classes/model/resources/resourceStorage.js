export default class ResourceStorage {
    resType;
    mine;
    _stored;
    
    constructor(resType, resources, mine) {
        this.resType = resType;
        
        this.set(resources.find(({type}) => type === resType).stored);
        this.mine = mine;
    }
    
    set stored(value) {
        this._stored = this.clean(value);
    }
    
    get stored() {
        return this._stored;
    }
    
    clean(amount) {
        return +amount.toFixed(5);
    }
    
    resourcesIn(seconds, h2oConsumption) {
        return this.clean(this.stored + this.productionIn(seconds, h2oConsumption));
    }
    
    productionIn(seconds, h2oConsumption = 0) {
        const prod = this.mine.hourlyProduction();
        return (prod > 0) ? this.clean(seconds * ((prod - h2oConsumption) / 3600)) : 0;
    }
    
    consumptionIn(seconds) {
        return this.clean(seconds * (this.mine.hourlyConsumption() / 3600));
    }
    
    apply(change) {
        switch (change.math) {
            case 'sub':
                this.consume(change.amount);
                break;
            case 'add':
                this.add(change.amount);
                break;
            case 'set' :
                this.set(change.amount);
                break;
        }
    }
    
    consume(amount) {
        if(amount < 0 || this.clean(amount) > this.stored || isNaN(amount)) {
            throw new ResourceError(Math.trunc(this.stored) + ' - ' + amount + ' ' + this.resType + ' nicht möglich');
        }
        
        this.stored -= Math.min(amount, this.stored);
    }
    
    add(amount) {
        if(amount < 0 || isNaN(amount)) {
            throw Error('Wert ist unerwartet negativ');
        }
        this.stored += amount;
    }
    
    set(amount) {
        if(amount < 0 || isNaN(amount)) {
            throw Error('Negative Werte sind nicht möglich');
        }
        this.stored = amount;
    }
    
    secondsToProduce(amount, {hourlyH2oProduction, hourlyH2oConsumption = 0}  = {} ) {
        const need = amount - this.stored;
        
        let hourlyProduction = this.mine.hourlyProduction() - hourlyH2oConsumption;
        
        if(hourlyH2oProduction && this.mine.hourlyConsumption() > hourlyH2oProduction) {
            hourlyProduction *= hourlyH2oProduction / this.mine.hourlyConsumption();
        }
        
        return (need <= 0) ? 0 :
               (hourlyProduction <= 0) ? Infinity :
               Math.ceil(need / hourlyProduction * 3600);
    }
    
    secondsToConsumeAll(hourlyConsumption) {
        const res = this.stored;
        const prod = this.mine.hourlyProduction();
        
        const consumption = hourlyConsumption - prod;
        
        const tillZero = res / consumption;
        
        return (tillZero < 0) ? Infinity : Math.floor(tillZero * 3600);
    }
}

export class ResourceError extends Error {}