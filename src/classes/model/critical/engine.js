import Account from '../infra/account';
import dependencyTree from './dependencyTree';

export default class Engine {
    threshold;
    result = [];
    tree;
    successHandler = () => {};
    builds = 0;
    target;
    
    constructor(days) {
        this.threshold = days * 24 * 3600;
    }
    
    onSuccess(handler) {
        this.successHandler = handler;
    }
    
    execute(target, path = [], accountState) {
        this.target = target;
        this.tree = dependencyTree(target);
        this.boosters = this.tree.boosters;
    
        this.recursive(new Account(accountState), path);
    }
    
    recursive(account, path) {
        this.builds++
        
        const state = account.state;
        account.completeAll();
    
        if(account.passed > this.threshold) {
        }
        else if(this.done(account)) {
            this.addResult(path, account.passed);
        }
        else {
            for(const construction of this.options(state)) {
                const next = new Account(state);
                next.completeAndEnqueue(construction);

                this.recursive(next, [...path, construction]);
            }
        }
    }
    
    options(state) {
        return new Set([...this.buildableSubtree(this.tree, state), ...this.boosters]);
    }
    
    buildableSubtree(node, acc) {
        const result = [];
    
        if(this.built(node, acc)) {
            result.push(...node.children.flatMap((child) => this.buildableSubtree(child, acc)));
        }
        else if(this.unlocked(node, acc)) {
            result.push(node.type);
        }
        
        return result;
    }
    
    built(node, acc) {
        return (this.level(node, acc) >= node.level);
    }
    
    unlocked(node, acc) {
        return node.parents.every((parent) => this.built(parent, acc));
    }
    
    level(node, acc) {
        const type = node.type;
        const infra = acc.planets[0].infra;
        const enqueued = acc.planets[0].current.filter(({ type }) => type === node.type).length;
        return enqueued + (acc.research[type] ?? infra.buildings[type] ?? infra.ships[type] ?? infra.towers[type] ?? 0);
    }
    
    done(acc) {
        return Object.entries(this.target).every(([type, level]) => acc.level(type) >= level);
    }
    
    logRam() {
        if(this.builds % 10000 === 0) {
            const used = process.memoryUsage();
            for (let key in used) {
                console.log(`${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
            }
        }
    }
    
    addResult(path, passed) {
        if(this.threshold === passed) {
            console.log('alternative', passed, this.result);
        }
        this.threshold = passed;
        this.result = path;
        this.successHandler(passed, path);
    }
}