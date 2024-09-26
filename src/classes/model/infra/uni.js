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
    get default() {return this.uni5},
    get list() { return ['uni5', 'beta4', 'speed4', 'uni4', 'uni3', 'speed3']; },
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
    },
    speed4: {
        NAME: 'speed4',
            SPEED: 6,
            START_DATE: new Date(2023, 9-1, 22, 20),
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
    beta4: {
        NAME: 'beta4',
        SPEED: 5,
        START_DATE: new Date(2024, 4-1, 5, 20),
        START_INFRA: {
            buildings: { [FACTORY.KZ]: 1 },
            ships: {},
            towers: {}
        },
        START_RES: [
            { type: RES.FE, stored: 12000 },
            { type: RES.LUT, stored: 8000 },
            { type: RES.H2O, stored: 2000 },
            { type: RES.H2, stored: 1000 }]
    },
    uni5: {
        NAME: 'uni5',
        SPEED: 2,
        START_DATE: new Date(2024, 10-1, 25, 20),
        START_INFRA: {
            buildings: { [FACTORY.KZ]: 1 },
            ships: {},
            towers: {}
        },
        START_RES: [
            { type: RES.FE, stored: 2500 },
            { type: RES.LUT, stored: 800 },
            { type: RES.H2O, stored: 500 },
            { type: RES.H2, stored: 0 }],
        PLANET_RES: [
            { type: RES.FE, stored: 500 },
            { type: RES.LUT, stored: 500 },
            { type: RES.H2O, stored: 500 },
            { type: RES.H2, stored: 0 }],
    },
};

export default UNI;
