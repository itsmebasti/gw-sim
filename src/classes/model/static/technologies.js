import buildingDescribes from './buildings.json';
import researchDescribes from './research.json';
import shipDescribes from './ships.json';
import towerDescribes from './towers.json';

export default {
    buildingDescribes, researchDescribes, shipDescribes, towerDescribes,

    buildings: buildingDescribes.map(describe => describe.type),
    research: researchDescribes.map(describe => describe.type),
    ships: shipDescribes.map(describe => describe.type),
    towers: towerDescribes.map(describe => describe.type),

    all: [...buildingDescribes, ...researchDescribes, ...shipDescribes, ...towerDescribes]
}