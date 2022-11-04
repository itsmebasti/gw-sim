export default class History {
    byCoords = {};
    selected;
    skipNext = false;
    
    switchTo(coords, initialPath) {
        this.selected = coords;
        
        if(!(coords in this.byCoords)) {
            this.byCoords[coords] = new Planet(initialPath);
        }
    }
    
    ignoreNextPush() {
        this.skipNext = true;
    }
    
    push(path) {
        if(this.skipNext) {
            this.skipNext = false;
        }
        else {
            this.planetHistory.push(path);
        }
    }
    
    back() {
        return this.planetHistory.back();
    }
    
    forth() {
        return this.planetHistory.forth();
    }
    
    get undoable() {
        return (this.selected && this.planetHistory.pointer > 0);
    }
    
    get redoable() {
        return (this.selected && this.planetHistory.pointer < this.planetHistory.entries.length-1);
    }
    
    get planetHistory() {
        return this.byCoords[this.selected];
    }
}

class Planet {
    pointer = -1;
    entries = [];
    
    constructor(initialPath) {
        this.push(initialPath);
    }

    push(path) {
        this.entries.splice(++this.pointer, Infinity, JSON.parse(JSON.stringify(path)));
    }
    
    back() {
        return JSON.parse(JSON.stringify(this.entries[--this.pointer]));
    }
    
    forth() {
        return JSON.parse(JSON.stringify(this.entries[++this.pointer]));
    }
}