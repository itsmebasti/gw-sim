import { CHANGE, RES } from '../static/types';

export default class ResourceChanges {
    type;
    changesByResType = {}
    
    constructor(fe=0, lut=0, h2o=0, h2=0, type = CHANGE.TRADE) {
        this.type = type;
        this.set(RES.FE, fe);
        this.set(RES.LUT, lut);
        this.set(RES.H2O, h2o);
        this.set(RES.H2, h2);
    }
    
    set(type, value) {
        this.changesByResType[type] = new Change(type, value);
    }
    
    isEmpty() {
        return this.values.every(({amount}) => amount === 0);
    }
    
    inverted() {
        this.values.forEach((res) => res.invert());
        return this;
    }
    
    ceil() {
        this.values.forEach((res) => res.ceil());
        return this;
    }
    
    keepDelta(planetRes) {
        this.values.forEach((change) => change.subtractTillZero(planetRes[change.type].stored));
        return this;
    }
    
    get values() {
        return Object.values(this.changesByResType);
    }
    
    toArray() {
        return this.values.map(({ amount, math }) => {
            if(math === "set") {
                throw new Error("Res overrides cannot be stringyfied");
            }
            
            const sign =
                (amount === 0) ? "" :
                (math === "add") ? "+" :
                (math === "sub") ? "-" : "";
        
            return Number(sign + Math.floor(amount));
        });
    }
    
    toString() {
        return this.toArray().join("/");
    }
    
    clone(type = this.type) {
        return new ResourceChanges(...this.toArray(), type);
    }
}

class Change {
    type;
    amount;
    math;
    
    constructor(type, amount) {
        this.type = type;
        this.amount = Math.abs(amount);
        this.math = (amount >= 0) ? "add" : "sub"
    }
    
    invert() {
        this.math =
            (this.math === "add") ? "sub" :
            (this.math === "sub") ? "add" : this.math;
    }
    
    ceil() {
        this.amount = Math.ceil(this.amount);
    }
    
    subtractTillZero(stored) {
        this.amount = Math.max(0, this.amount - stored);
    }
}