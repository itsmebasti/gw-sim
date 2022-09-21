export default class Channel {
    constructor() {
        this.handlers = [];
    }
    
    add(handler) {
        if(this.handlers.length > 100) {
            throw Error("Channel Subscription Overflow");
        }
        
        this.handlers.push(handler);
    }
    
    register(event) {
        this.handlers.forEach(event.add);
    }
}