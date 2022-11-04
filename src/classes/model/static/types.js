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
    FARM: Symbol('FARM'),
    COST: Symbol('AUSGABEN'),
    TRADE: Symbol('HANDEL'),
    TRADE_OUT: Symbol('HANDEL_RAUS'),
    SAVE: Symbol('SAVE_FLUG'),
    TRANSPORT: Symbol('TRANSPORT'),
    PRODUCED: Symbol('PRODUZIERT'),
    GENERATED: Symbol('GENERIER'),
    NEED: Symbol('BENÖTIGT'),
    MANUALLY: Symbol('MANUELL'),
}

export const E = {
    FLEET_CHANGE: Symbol('FLEET_CHANGE'),
    RESOURCE_CHANGE: Symbol('RESOURCE_CHANGE'),
    RESOURCE_REQUEST: Symbol('RESOURCE_REQUEST'),
    REDUCED_H2_PROD: Symbol('REDUCED_H2_PROD'),
    START_REQUEST: Symbol('START_REQUEST'),
    STARTED: Symbol('STARTED'),
    FINISHED: Symbol('FINISHED'),
    FAILED: Symbol('FAILED'),
    NEW_PLANET: Symbol('NEW_PLANET'),
    
    EVENT_CHANGE: Symbol('EVENT_CHANGE'),
    FULFILLING_DEPENDENCY: Symbol('FULFILLING_DEPENDENCY'),
    FINISH_RESEARCH_CENTER: Symbol('FINISH_RESEARCH_CENTER'),
    PRE_CONTINUE: Symbol('PRE_CONTINUE'),
    CONTINUE: Symbol('CONTINUE')
};