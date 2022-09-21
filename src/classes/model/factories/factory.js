import { E } from '../static/types';
import InfraEvent from '../../framwork/events/infraEvent';
import Building from '../constructions/building'

export default class Factory extends Building {
    coords;
    account;
    queue = [];
    timeLeft = 0;
    
    constructor(describe, coords, level, account) {
        super(describe, level, account.uni.SPEED);
        this.coords = coords;
        this.account = account;
        account.subscribe(E.WAITING, this.continue, coords);
    }
    
    initializeQueue(construction, timeLeft) {
        this.queue.push(construction);
        this.timeLeft = timeLeft;
        
        this.registerCurrentForCompletion();
    }
    
    continue = ({duration}) => {
        if(duration <= this.timeLeft) {
            this.timeLeft -= duration;
        }
        else if(this.constructing && duration > this.timeLeft) {
            throw new Error("Construction completion was skipped");
        }
    }
    
    completeCurrent() {
        this.account.continueWhile(() => !!this.timeLeft);
    }
    
    finishCurrentToFulfillDependency(construction) {
        const current = this.first;
        const unfulfilledDependency = (this.constructing && construction.dependencyLevel(current.type) === current.level + 1);
        
        if(unfulfilledDependency) {
            this.completeCurrent();
        }
    }
    
    completeAndEnqueue(construction) {
        this.completeCurrent();
        this.enqueue(construction);
    }
    
    enqueue(construction) {
        construction && this.queue.push(construction);
        this.requestStartNext();
    }
    
    requestStartNext() {
        if(!this.constructing && this.queue.length > 0) {
            this.account.publish(new InfraEvent(E.START_REQUEST, {construction: this.first}, this.coords));
        }
    }
    
    // Note: triggered from outside, after Construct Request
    startNext() {
        if(this.constructing) {
            throw Error(this.first.type + " ist noch nicht abgeschlossen");
        }
        else if(this.queue.length === 0) {
            throw Error("BS ist leer");
        }
        
        const next = this.first;
        const resourceChanges = next.increaseCosts().inverted();
        this.timeLeft = next.increaseSeconds(this.level);
    
        this.account.publish(new InfraEvent(E.RESOURCE_CHANGE, { resourceChanges }, this.coords));
        this.account.publish( new InfraEvent(E.STARTED,
            { construction: next, duration: this.timeLeft }), this.coords);
        
        this.registerCurrentForCompletion();
    }
    
    registerCurrentForCompletion() {
        const finishEvent = new InfraEvent(E.FINISHED, {construction : this.first}, this.coords)
                            .add(this.finish);
        this.account.register(finishEvent, {time: this.timeLeft});
    }
    
    finish = () => {
        this.queue.shift().increaseLevel();
        this.requestStartNext();
    }
    
    skipNext(error) {
        const construction = this.queue.shift();
        this.account.publish(new InfraEvent(E.FAILED, { error, construction }, this.coords));
        
        this.requestStartNext();
    }
    
    get constructing() {
        return this.timeLeft > 0;
    }
    
    get first() {
        return this.queue[0];
    }
}