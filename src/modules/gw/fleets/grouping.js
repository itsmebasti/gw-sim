export class Grouping extends Array {
    
    byCoordsOf(sourceOrTarget) {
        return this.reduce((result, fleet) => {
            const coords = fleet[sourceOrTarget].coords;
            result[coords] = result[coords] || {};
        
            Object.entries(fleet.res).forEach(([resource, value]) => {
                result[coords][resource] = result[coords][resource] || 0;
                result[coords][resource] += value;
            });
        
            return result;
        }, {});
    }
    
    byPlayer() {
        return this.reduce((result, fleet) => {
            const player = fleet.target.player;
            result[player] = result[player] || {};
            
            Object.entries(fleet.res).forEach(([resource, value]) => {
                result[player][resource] = result[player][resource] || 0;
                result[player][resource] += value;
            });
            
            return result;
        }, {});
    }
    
    bySourcePlayer() {
        return this.reduce((result, fleet) => {
            const player = fleet.source.player;
            result[player] = result[player] || {};
            
            Object.entries(fleet.res).forEach(([resource, value]) => {
                result[player][resource] = result[player][resource] || 0;
                result[player][resource] += value;
            });
            
            return result;
        }, {});
    }
    
    sum() {
        return this.reduce((result, fleet) => {
            
            Object.entries(fleet.res).forEach(([resource, value]) => {
                result[resource] = result[resource] || 0;
                result[resource] += value;
            }, result);
            
            return result;
        }, {});
    }
}
