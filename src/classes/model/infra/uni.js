import { RES, FACTORY } from '../static/types';

export function accountState(uniName) {
    const uni = UNI[uniName];
    return {
        uni: uni.NAME,
        player: 'Default',
        planets: [{coords: "1:1:1", infra: uni.START_INFRA, resources: uni.START_RES, current: []}],
        research: {},
        serverTime: uni.START_DATE.getTime()
    };
}

const UNI = {
    get default() {return this.uni4},
    get list() { return ['uni4', 'uni3', 'speed3']; },
    uni3: {
        NAME: 'uni3',
        SPEED: 1,
        START_DATE: new Date(2020, 4-1, 24, 20),
        START_INFRA: {
            buildings: { [FACTORY.KZ]: 1 },
            ships: {},
            towers: {}
        },
        START_RES: [
            { type: RES.FE, stored: 500 },
            { type: RES.LUT, stored: 500 },
            { type: RES.H2O, stored: 500 },
            { type: RES.H2, stored: 0 }]
    },
    uni4: {
        NAME: 'uni4',
        SPEED: 1,
        START_DATE: new Date(2022, 9-1, 9, 20),
        START_INFRA: {
            buildings: { [FACTORY.KZ]: 1 },
            ships: {},
            towers: {}
        },
        START_RES: [
            { type: RES.FE, stored: 500 },
            { type: RES.LUT, stored: 500 },
            { type: RES.H2O, stored: 500 },
            { type: RES.H2, stored: 0 }]
    },
    speed3: {
        NAME: 'speed3',
            SPEED: 6,
            START_DATE: new Date(2022, 2-1, 4, 20),
            START_INFRA: {
            buildings: { [FACTORY.KZ]: 1 },
            ships: {},
            towers: {}
        },
        START_RES: [
            { type: RES.FE, stored: 500 },
            { type: RES.LUT, stored: 500 },
            { type: RES.H2O, stored: 500 },
            { type: RES.H2, stored: 0 }]
    }
};

export default UNI;