import Planet from './planet'
import EventBus from '../../framwork/events/eventBus';
import ResourceChanges from '../resources/resourceChanges';
import { CHANGE, E } from '../static/types';
import InfraEvent from '../../framwork/events/infraEvent';
import technologies from '../static/technologies';
import Research from '../constructions/research';
import UNI from '../../../classes/model/infra/uni';

export default class Account extends EventBus {
    uni;
    player;
    serverTime;
    planets;
    research;
    current;
    
    constructor(data) {
        super();
    
        this.uni = UNI[data.uni] ?? UNI.default;
        this.player = data.player;
        this.serverTime = data.serverTime;
        this.research = this.researchObject(data.research, this.uni.SPEED);
        this.planets = this.planetObjects(data.planets, this.uni.SPEED);
        
        this.current = this.planets[0].coords;
    }
    
    researchObject(plain, speed) {
        return technologies.researchDescribes.reduce((result, describe) => {
            result[describe.type] = new Research(describe, plain[describe.type], speed);
            
            return result;
        }, {});
    }
    
    planetObjects(plain, speed) {
        return plain.map((planet) => new Planet(planet, this, speed))
    }
    
    get state() {
        return {
            uni: this.uni.NAME,
            player: this.player,
            serverTime: this.serverTime + this.passed,
            planets: this.planets.map(({ state }) => state),
            research: Object.values(this.research).reduce((result, {type, level}) => (result[type] = level, result), {})
        };
    }
    
    get planet() {
        return this.planets.find((planet) => planet.coords === this.current);
    }
    
    addResources(resources, resourceChanges = new ResourceChanges(...resources, CHANGE.TRADE)) {
        this.publish(new InfraEvent(E.RESOURCE_CHANGE, {resourceChanges}, this.planet.coords));
    }
    
    enqueue(construction) {
        this.planet.enqueue(construction);
    }
    
    completeAndEnqueue(construction) {
        this.planet.completeAndEnqueue(construction);
    }
    
    completeAll() {
        this.flush();
    }
    
    complete(factory) {
        this.planet.complete(factory);
    }

    completeAllOn(coords) {
        this.continueWhile(() => this.queue.some(({event: {scope}}) => scope === coords || scope === "global"))
    }
    
    get coords() {
        return this.planets.map(({ coords }) => coords);
    }
    
    get(type) {
        return this.planet.get(type);
    }
    
    level(type) {
        return this.get(type).level;
    }
}