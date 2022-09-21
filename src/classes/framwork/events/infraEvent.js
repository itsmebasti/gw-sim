export default class InfraEvent {
    scope;
    type;
    details;
    handlers;
    
    constructor(type, details, scope = "global") {
        this.scope = scope;
        this.type = type;
        this.details = details;
        this.handlers = [];
    }
    
    add = (handler) => {
        this.handlers.push(handler);
        return this;
    }
    
    fire() {
        this.handlers.forEach((handler) => handler(this.details, this.scope));
    }
}