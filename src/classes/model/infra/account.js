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
        
        this.subscribe(E.NEW_PLANET, this.addNewPlanet);
    }
    
    addNewPlanet = ({coords}) => {
        if(!this.planets.map(({coords}) => coords).includes(coords)) {
            this.planets.push(new Planet({coords, infra: this.uni.START_INFRA, resources: this.uni.START_RES, current: []}, this, this.uni.SPEED));
        }
    }
    
    researchObject(plain) {
        return technologies.researchDescribes.reduce((result, describe) => {
            result[describe.type] = new Research(describe, plain[describe.type], this.uni.SPEED);
            
            return result;
        }, {});
    }
    
    planetObjects(plain, speed) {
        return plain.map((planet) => new Planet(planet, this, this.uni.SPEED))
    }
    
    get state() {
        return {
            uni: this.uni.NAME,
            player: this.player,
            serverTime: this.serverTime + this.passed * 1000,
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