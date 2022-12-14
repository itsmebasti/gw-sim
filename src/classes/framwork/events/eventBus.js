import InfraEvent from './infraEvent';
import Channel from './channel';
import { E } from '../../model/static/types';

export default class EventBus {
    passed = 0;
    channels;
    queue;

    constructor(passed = 0) {
        this.passed = passed;
        this.channels = {}
        this.queue = [];
        this.subscribe(E.EVENT_CHANGE, this.updateEvent);
    }
    
    publish(event) {
        this.register(event);
    }

    register(event, {time = 0, interval = 0, iterations = 1} = {time: 0, interval: 0, iterations: 1}) {
        if(time < 0) throw 'the event has to happen in the future';

        for(let i = 1; i <= iterations; i++) {
            this.queue.push({event, timeLeft: time + (interval * i)});
            this.sortQueue();
        }

        this.continue(0);
    }

    subscribe(type, handler, scope = "global") {
        (this.channels[scope] = this.channels[scope] ?? this.eventChannels)[type].add(handler);
    }

    sortQueue() {
        this.queue.sort((a, b) => a.timeLeft - b.timeLeft);
    }

    updateEvent = ({filter, event, timeLeft}) => {
        this.queue
            .filter(({event : {type}}) => type === event)
            .filter(({event}) => Object.entries(filter).every(([key, value]) => event.details[key] === value))
            .forEach((enqueued) => enqueued.timeLeft = timeLeft);
        this.sortQueue();
    }

    fireNextOrContinue(maxSeconds) {
        this.continue(this.nextOr(maxSeconds));
    }

    flush() {
        this.continueWhile(() => !!this.tilNext);
    }

    continueWhile(condition) {
        while(condition()) this.continue(this.tilNext);
    }

    continue(seconds) {
        if(this.tilNext === 0) {
            const event = this.queue.shift().event;

            if (event.scope === "global") {
                Object.values(this.channels).forEach((channel) => channel[event.type].register(event));
            } else {
                this.channels[event.scope]?.[event.type].register(event);
                this.channels["global"][event.type].register(event);
            }
            
            event.fire();
            
            this.continue(seconds);
        }
        else if(seconds > 0) {
            this.register(new InfraEvent(E.PRE_CONTINUE, { duration: this.nextOr(seconds) }));
            
            const toProcess = this.nextOr(seconds);
            this.passed += toProcess;
            
            this.publish(new InfraEvent(E.CONTINUE, { duration: toProcess, total: this.passed }));
            this.queue.forEach((evt) => evt.timeLeft -= toProcess);
            
            this.continue(seconds - toProcess);
        }
    }

    get eventChannels() {
        return Object.values(E).reduce((result, symbol) => (result[symbol] = new Channel(), result), {});
    }

    get tilNext() {
        return this.queue[0]?.timeLeft;
    }

    nextOr(seconds) {
        return Math.min(this.tilNext ?? Infinity, seconds);
    }
}
