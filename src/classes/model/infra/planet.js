import ResourceCenter from '../resources/resourceCenter';
import InfraEvent from '../../framwork/events/infraEvent';
import DetailedError from '../../framwork/misc/detailedError';
import { FACTORY, MINES, FACTORIES, E, CHANGE } from '../static/types';
import technologies from '../static/technologies';
import CommandCenter from '../factories/commandCenter';
import ResearchCenter from '../factories/researchCenter';
import ArtilleryFactory from '../factories/artilleryFactory';
import Building from '../constructions/building';
import Ship from '../constructions/ship';
import Tower from '../constructions/tower';

export default class Planet {
    coords;
    account;
    buildings;
    ships;
    towers;
    resources;
    
    constructor(data, account, speed) {
        this.coords = data.coords;
        this.account = account;
        this.buildings = this.buildingObjects(data.infra.buildings, speed);
        this.ships = this.shipObjects(data.infra.ships, speed);
        this.towers = this.towerObjects(data.infra.towers, speed);
    
        data.current.forEach(({factory, type, timeLeft}) => this.get(factory).initializeQueue(this.get(type), timeLeft))
        
        this.resources = new ResourceCenter(...MINES.map((mine) => this.get(mine)), data.resources);
    
        account.subscribe(E.START_REQUEST, this.handleStartRequest, this.coords);
        account.subscribe(E.RESOURCE_CHANGE, this.handleResourceChange, this.coords);
        account.subscribe(E.PRE_CONTINUE, this.validateH2Prod, this.coords);
        account.subscribe(E.CONTINUE, ({duration}) => this.resources.produceIntoStorage(duration));
    }
    
    handleResourceChange = ({resourceChanges}) => {
        const waterBefore = this.resources.h2oStorage.stored;
        
        this.resources.apply(resourceChanges);
        
        const waterAfter = this.resources.h2oStorage.stored;
        
        if(waterBefore > 0 && waterAfter === 0) {
            this.account.publish(new InfraEvent(E.REDUCED_H2_PROD, {}, this.coords));
        }
    }
    
    validateH2Prod = ({duration}) => {
        const secondsTillWaterIsEmpty = this.resources.secondsTillWaterIsEmpty();
        
        if(secondsTillWaterIsEmpty > 0 && secondsTillWaterIsEmpty < duration) {
            this.account.register(new InfraEvent(E.REDUCED_H2_PROD, {}, this.coords), {time: secondsTillWaterIsEmpty});
        }
    }
    
    buildingObjects(plain, speed) {
        return technologies.buildingDescribes.reduce((result, describe) => {
            const type = describe.type;
            const level = plain[type];
            
            switch (describe.type) {
                case FACTORY.KZ: result[type] = new CommandCenter(describe, this.coords, level, this.account); break;
                case FACTORY.FZ: result[type] = new ResearchCenter(describe, this.coords, level, this.account); break;
                case FACTORY.SF: result[type] = new ArtilleryFactory(describe, this.coords, level, this.account); break;
                case FACTORY.VS: result[type] = new ArtilleryFactory(describe, this.coords, level, this.account); break;
                default: result[type] = new Building(describe, level, speed);
            }
            
            return result;
        }, {});
    }
    
    shipObjects(plain, speed) {
        return technologies.shipDescribes.reduce((result, describe) => {
            result[describe.type] = new Ship(describe, plain[describe.type], speed);
            return result;
        }, {});
    }
    
    towerObjects(plain, speed) {
        return technologies.towerDescribes.reduce((result, describe) => {
            result[describe.type] = new Tower(describe, plain[describe.type], speed);
            return result;
        }, {});
    }
    
    get state() {
        return {
            coords: this.coords,
            infra: {
                buildings: Object.values(this.buildings).reduce((result, {type, level}) => (result[type] = level, result), {}),
                ships: Object.values(this.ships).reduce((result, {type, level}) => (result[type] = level, result), {}),
                towers: Object.values(this.towers).reduce((result, {type, level}) => (result[type] = level, result), {}),
            },
            resources: this.resources.state,
            current: FACTORIES
                .map((factory) => this.get(factory))
                .filter(({first}) => first)
                .map(({type, first, timeLeft}) => ({factory: type, type: first.type, timeLeft}))
        };
    }
    
    enqueue(construction) {
        construction = this.reference(construction);
        this.factoryFor(construction).enqueue(construction);
    }
    
    complete(factory) {
        this.get(factory).completeCurrent();
    }

    completeAndEnqueue(construction) {
        construction = this.reference(construction);
        this.factoryFor(construction).completeAndEnqueue(construction);
    }
    
    handleStartRequest = ({construction}) => {
        try {
            this.kz.finishCurrentToFulfillDependency(construction);
            this.fz.finishCurrentToFulfillDependency(construction);
            
            this.assertFulfilledDependencies(construction);
            
            this.publishResRequest(construction);
            
            this.kz.finishFzForFasterResearch(construction, this.waitTimeFor(construction));
            
            let waitTime;
            while((waitTime = this.waitTimeFor(construction)) > 0) {
                if(waitTime === Infinity) {
                    throw new Error("Wichtige Resourcen werden nicht produziert.");
                }
    
                this.account.fireNextOrContinue(waitTime);
            }
            
            this.factoryFor(construction).startNext();
        }
        catch (error) {
            this.factoryFor(construction).skipNext(error);
        }
    }
    
    publishResRequest(construction) {
        const missing = construction
            .increaseCosts()
            .clone(CHANGE.NEED)
            .keepDelta(this.resources.state)
            .ceil();
        
        if(!missing.isEmpty()) {
            this.account.publish(new InfraEvent(E.RESOURCE_REQUEST, { resources: missing, construction }, this.coords));
        }
    }
    
    waitTimeFor(construction) {
        return this.resources.timeToProduce(...construction.increaseCosts().toArray());
    }
    
    assertFulfilledDependencies(construction) {
        const open = construction.dependencies().filter(({ type, level }) => (this.level(type) < level));
        
        if(open.length > 0) {
            throw new DetailedError(
                "Bau von " + construction.type + " nicht möglich.",
                ["Bedingung: " + open.map((dependency) => " " + dependency.type + " " + dependency.level)]
            );
        }
    }
    
    reference(construction) { return (typeof construction === "string") ? this.get(construction) : construction; }
    factoryFor(construction) { return this.get(construction.factoryType); }
    
    get(type) { return this.buildings[type] ?? this.account.research[type] ?? this.ships[type] ?? this.towers[type]; }
    level(type) { return this.get(type).level }
    get kz() { return this.get(FACTORY.KZ); }
    get fz() { return this.get(FACTORY.FZ); }
    get sf() { return this.get(FACTORY.SF); }
    get ob() { return this.get(FACTORY.VS); }
}