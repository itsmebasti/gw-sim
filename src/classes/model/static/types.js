export const RES = {
    FE: 'fe',
    LUT: 'lut',
    H2O: 'h2o',
    H2: 'h2'
}
export const RESOURCES = Object.values(RES);

export const NAMES = {
    [RES.FE]: 'Eisen',
    [RES.LUT]: 'Lutinum',
    [RES.H2O]: 'Wasser',
    [RES.H2]: 'Wasserstoff'
}

export const STORAGE = {
    [RES.FE]: 'Eisenspeicher',
    [RES.LUT]: 'Lutinumspeicher',
    [RES.H2O]: 'Wassertanks',
    [RES.H2]: 'Wasserstofftanks'
}

export const MINE = {
    FE: 'Eisenmine',
    LUT: 'Lutinumraffinerie',
    H2O: 'Bohrturm',
    H2: 'Chemiefabrik',
    H2E: 'Erweiterte Chemiefabrik'
};
export const MINES = Object.values(MINE);

export const FACTORY = {
    KZ: 'Kommandozentrale',
    FZ: 'Forschungszentrum',
    SF: 'Schiffsfabrik',
    VS: 'Orbitale Verteidigungsstation'
};
export const FACTORIES = Object.values(FACTORY);

export const CHANGE = {
    FARM: Symbol('farm'),
    COST: Symbol('cost'),
    TRADE: Symbol('trade'),
    TRADE_OUT: Symbol('tradeOut'),
    SAVE: Symbol('save'),
    TRANSPORT: Symbol('transport')
}

export const E = {
    FLEET_CHANGE: Symbol(),
    RESOURCE_CHANGE: Symbol(),
    RESOURCE_REQUEST: Symbol(),
    START_REQUEST: Symbol(),
    STARTED: Symbol(),
    FINISHED: Symbol(),
    FAILED: Symbol(),
    NEW_PLANET: Symbol(),
    
    EVENT_CHANGE: Symbol(),
    WAITING: Symbol()
};