import Factory from './factory';
import Research from '../constructions/research';
import { FACTORY, E } from '../static/types';
import InfraEvent from '../../framwork/events/infraEvent';

export default class CommandCenter extends Factory {
    finishFzForFasterResearch(toBeConstructed, waitTime) {
        if(this.first?.type === FACTORY.FZ && toBeConstructed instanceof Research) {
            const incrementTimeBefore = toBeConstructed.increaseSeconds(this.first.level);
            const incrementTimeAfter = toBeConstructed.increaseSeconds(this.first.level + 1);
            
            const before = waitTime + incrementTimeBefore;
            const after = this.timeLeft + incrementTimeAfter;
            if(after <= before) {
                this.account.publish(new InfraEvent(E.FINISH_RESEARCH_CENTER, {after, before}, this.coords));
                this.completeCurrent();
            }
        }
    }
}