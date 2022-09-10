import Factory from './factory';
import InfraEvent from '../../framwork/events/infraEvent';
import { E } from '../static/types';

export default class ArtilleryFactory extends Factory {
    constructor(describe, coords, level, account) {
        super(describe, coords, level, account);
        account.subscribe(E.FINISHED, this.reduceTimeOfCurrent, coords);
    }
    
    reduceTimeOfCurrent = ({construction}) => {
        if (construction === this && this.constructing) {
            const current = this.first.increaseSeconds(this.level - 1);
            const next = this.first.increaseSeconds(this.level);
            const previous = this.timeLeft;
    
            this.timeLeft = Math.ceil(previous * next / current);
            
            this.account.publish(new InfraEvent(E.EVENT_CHANGE, {
                event: E.FINISHED,
                filter: { construction: this.first },
                previous,
                timeLeft: this.timeLeft
            }));
        }
    }
    
    cancelQueue() {
    
    }
}