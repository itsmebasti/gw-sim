import Factory from './factory';
import Research from '../constructions/research';
import { FACTORY } from '../static/types';

export default class CommandCenter extends Factory {
    finishFzForFasterResearch(toBeConstructed, waitTime) {
        if(this.first?.type === FACTORY.FZ && toBeConstructed instanceof Research) {
            const incrementTimeBefore = toBeConstructed.increaseSeconds(this.first.level);
            const incrementTimeAfter = toBeConstructed.increaseSeconds(this.first.level + 1);
    
            if(this.timeLeft + incrementTimeAfter <= waitTime + incrementTimeBefore) {
                this.completeCurrent();
            }
        }
    }
}