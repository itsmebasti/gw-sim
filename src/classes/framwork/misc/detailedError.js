export default class DetailedError extends Error {
    details;
    
    constructor(message, details = []) {
        super(message);
        
        this.details = details;
    }
    
    toString() {
        return super.toString() + "\n" + this.details.join("\n");
    }
}