import Account from '../infra/account';
import { FACTORY, RES, MINE } from '../static/types';

let planet;
let allNodes;

export default function dependencyTree(target) {
    planet = new Account().planet;
    allNodes = {};
    Object.entries(target).forEach(([type, level]) => nodeFor(type, level));
    
    const tree = nodeFor(FACTORY.KZ, 1);
    tree.print();
    
    return Object.freeze(tree);
}

function nodeFor(type, level) {
    allNodes[type] = allNodes[type] ?? {};
    return allNodes[type][level] = allNodes[type][level] ?? new DependencyTree(type, level);
}

class DependencyTree {
    type;
    level;
    parents = []; //dependencies
    children = []; // depending on me
    printed = false;
    
    constructor(type, level) {
        const construction = planet.get(type);
        this.type = type;
        this.level = level;
    
        if(level === 1) {
            if(construction.type !== FACTORY.KZ && construction.factoryType === FACTORY.KZ) {
                this.parents.push(nodeFor(FACTORY.KZ, 1));
            }
            construction.dependencies(level).forEach(({ type, level }) =>
                this.parents.push(nodeFor(type, level))
            );
        }
        else {
            this.parents.push(nodeFor(type, level-1));
        }
    
        construction.requiredStorage(level).forEach(({ type, level }) => this.parents.push(nodeFor(type, level)));
        (construction.increaseCost([RES.H2], 1) > 2000) ? this.parents.push(nodeFor(MINE.H2E, 1)) :
            (construction.increaseCost([RES.H2], 1) > 0) ? this.parents.push(nodeFor(MINE.H2, 1)) : 0;
    
        this.parents.forEach((p) => p.children.push(this));
    }
    
    print() {
        console.log(this.type, this.level);
        this.printed = true;
        this.children
            .filter((child) => child.parents.every(({printed}) => printed))
            .forEach((child) => child.print());
    }
    
    get boosters() {
        const construction = planet.get(this.type);
        const result = new Set();
        
        (construction.increaseCost([RES.FE], 1) > 0) && result.add(MINE.FE);
        (construction.increaseCost([RES.LUT], 1) > 0) && result.add(MINE.LUT);
        (construction.increaseCost([RES.H2O], 1) > 0) && result.add(MINE.H2O);
        (construction.increaseCost([RES.H2], 1) > 0) && [MINE.H2O, MINE.H2].forEach(result.add, result);
        (construction.increaseCost([RES.H2], 1) > 2000) && result.add(MINE.H2E);
        result.delete(construction.type);
        
        result.add(construction.factoryType);
        
        return new Set([...result, ...this.children.flatMap((child) => [...child.boosters])]);
    }
}