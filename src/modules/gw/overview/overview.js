import { LightningElement, api, track } from 'lwc';
import { CacheMixin, trueTypeOf } from 'lwc-base';
import { toHHMMSS, toSeconds } from '../../../classes/framwork/misc/timeConverters';
import Database from '../../../classes/framwork/database/database';
import Account from '../../../classes/model/infra/account';
import InfraEvent from '../../../classes/framwork/events/infraEvent';
import ResourceChanges from '../../../classes/model/resources/resourceChanges';
import UNI, { accountState } from '../../../classes/model/infra/uni';
import { CHANGE, RESOURCES, E } from '../../../classes/model/static/types';

export default class Overview extends CacheMixin(LightningElement) {
    selectedTime;

    database = new Database();
    accountState;
    account;
    resFleets = [];
    paths = [];

    columnsByName = {};

    @track cache = this.cached({ selectedAccount: 'Default' });

    connectedCallback() {
        this.refresh();
    }

    renderedCallback() {
        this.template.querySelector('gw-time-slider').focus();
    }

    @api refresh(accountName = this.cache.selectedAccount ?? 'Default') {
        return this.database.get('AccountData', accountName)
            .then((state) => {
                this.accountState = state ?? accountState(UNI.default);
                this.selectedTime = this.serverTime;
            })
            .then(() => this.database.getAll('Paths'))
            .then((paths) => this.paths = paths)
            .then(() => this.database.getAllBy('Fleets', 'deliveryTime', IDBKeyRange.lowerBound(this.serverTime)))
            .then((resFleets) => this.resFleets = resFleets?.filter(({havingRes}) => havingRes))
            .then(() => this.restart())
            .catch(console.error)
    }

    goTo(timestamp) {
        const delta = timestamp - this.selectedTime;
        this.selectedTime = timestamp;

        if(delta <= 0) {
            this.account = new Account(this.accountState);
            this.account.subscribe(E.RESOURCE_REQUEST, this.handleResRequest);
            this.account.subscribe(E.RESOURCE_CHANGE, this.addRes);
            this.account.subscribe(E.FLEET_CHANGE, this.addFleet);
            this.account.subscribe(E.FAILED, this.logError);

            this.initializeColumns();

            this.registerEvents();

            this.updateColumns(this.passedSeconds);
        }
        else {
            this.updateColumns(delta);
        }
    }

    registerEvents() {
        this.resFleets
            ?.filter(({delivery}) => delivery.planet.isOwnPlanet)
            .forEach((fleet) => {
                if(this.coords.includes(fleet.delivery.planet.coords)) {
                    const time = fleet.delivery.time - this.serverTime;
                    const resourceChanges = new ResourceChanges(...Object.values(fleet.res), this.resChangeType(fleet));

                    const event = new InfraEvent(E.RESOURCE_CHANGE, { resourceChanges }, fleet.delivery.planet.coords);
                    this.account.register(event, {time});
                }
            })

        // deployFleets.forEach((fleet) => {
        //     const time = fleet.deploy.time;
        //     const event = new InfraEvent(E.FLEET_CHANGE, fleet, fleet.deploy.planet.coords);
        //
        //     this.account.register(event,{time});
        // });

        this.paths?.forEach((path) => {
            const [uni, player, coords] = path.name.split(' ');

            if(this.accountState.player === player && this.accountState.uni === uni && this.account.coords.includes(coords)) {
                this.account.current = coords;

                path.steps.forEach((step) => {
                    if(step.type === 'start') {
                        this.account.enqueue(step.tec);
                    }
                });
            }
        });
    }

    initializeColumns() {
        this.columnsByName = {};

        this.accountState.planets.forEach((planet) => {
            this.columnsByName[planet.coords] = { name: planet.coords, res: this.resGroup(), logs: [] };
        });

        this.columnsByName.fleet = {name: 'Flotte', queue: [], res: this.resGroup(), logs: [] };
        this.columnsByName.totals = {name: 'Totals', queue: [], res: this.resGroup(), logs: [] };

        this.addInfra();
        this.addFleetRes();
    }

    addFleetRes() {
        this.resFleets
            .filter(({delivery}) => delivery.planet.isOwnPlanet)
            .forEach((fleet) => {
                const coords = fleet.delivery.planet.coords;

                if(this.coords.includes(coords)) {
                    this.addResTo(this.columnsByName[coords].res.farmFuture, fleet.res);
                    this.addResTo(this.columnsByName['fleet'].res.farm, fleet.res);
                }
            })
    }

    addInfra() {
        const fullState = new Account(this.accountState).state;
        fullState.planets.forEach((planet) => {
            const plain = this.columnsByName[planet.coords];

            planet.resources
                .forEach(({ type, stored }) => plain.res.before[type] = stored | 0);

            const {infra: {buildings, ships, towers}} = planet;
            Object.entries({...buildings, ...ships, ...towers})
                .forEach(([tec, before]) => plain[tec] = {before, after: before});
        });
    }

    updateColumns(seconds) {
        this.account.continue(seconds);

        this.columnsByName.totals.res = this.resGroup();

        this.account.planets.forEach((planet) => {
            this.updateRes(planet);
            this.updateInfra(planet);
            const plain = this.columnsByName[planet.coords];
            Object.entries(plain.res).forEach(([group, amountByType]) =>
                this.addResTo(this.columnsByName.totals.res[group], amountByType));
        });

        this.columnsByName = this.formatNumbers(this.columnsByName);
    }

    updateRes(planet) {
        const plain = this.columnsByName[planet.coords];

        planet.resources.printable.forEach(({ type, stored, hourlyProduction }) => {
            plain.res.prod[type] = (this.num(hourlyProduction) * (this.passedSeconds / 3600)) | 0;
            plain.res.sum[type] = stored;
        });
    }

    updateInfra(planet) {
        const plain = this.columnsByName[planet.coords];
        const {buildings, ships, towers} = planet;

        Object.values({...buildings, ...ships, ...towers})
            .forEach((tec) => plain[tec.type].after = tec.level);

        plain.building = planet.kz.first?.type ?? '';
        plain.timeLeft = planet.kz.timeLeft > 0 ? toHHMMSS(planet.kz.timeLeft) : '';
        plain.queue = planet.kz.queue[1]?.type ?? '';
    }

    resGroup() {
        const result = {before: {}, prod: {}, transport: {}, transportFuture: {},
            trade: {}, tradeFuture: {}, tradeOut: {}, farm: {}, farmFuture: {}, cost: {}, sum: {}};

        Object.keys(result).forEach((group) => RESOURCES.forEach((res) => result[group][res] = 0));

        return result;
    }

    addResTo(group, res) {
        Object.entries(res).forEach(([type, amount]) =>
            group[type] = this.num(group[type]) + this.num(amount));
    }

    resChangeType({mission, source, target, friendly}) {
        return (mission === 'Transport' && source.isOwnPlanet) ? CHANGE.TRANSPORT :
                (mission === 'Stationierung') ? CHANGE.TRANSPORT :
                (friendly && !target.exists) ? CHANGE.TRANSPORT :
                (!friendly && source.isOwnPlanet) ? CHANGE.FARM :
                (mission === 'Transport' && !source.isOwnPlanet) ? CHANGE.TRADE :
                (mission === 'Transport' && !target.isOwnPlanet && target.exists) ? CHANGE.TRADE_OUT : '';
    }

    handleResRequest = ({ resources }, coords) => {
        this.account.publish(new InfraEvent(E.RESOURCE_CHANGE,
            { resourceChanges: resources.clone(CHANGE.TRANSPORT) }, coords));

        const res = resources.values.map(({type, amount}) => this.formatNumbers(amount) + ' ' + type.toUpperCase());

        this.logError({error: res.join('\n')}, coords);
    };


    logId = 0;
    logError = ({error}, coords) => {
        const seconds = this.account.passed;
        const time = new Date((this.serverTime + seconds) *1000);

        this.columnsByName[coords].logs.push({
            id: this.logId++,
            date: time.toLocaleString(),
            message: error,
            title: toHHMMSS(seconds)
        });
    }


    addRes = ({resourceChanges}, coords) => {
        const groupName = resourceChanges.type.description;
        const resGroup = this.columnsByName[coords].res[groupName];
        const farmFuture = this.columnsByName[coords].res.farmFuture;

        resourceChanges.values.forEach((change) => {
            resGroup[change.type] = this.num(resGroup[change.type]) + change.amount;

            if(groupName === 'farm') {
                farmFuture[change.type] = this.num(farmFuture[change.type]) - change.amount;
            }
        });
    }

    addFleet = ({type, amount}, coords) => {
        this.columnsByName[coords][type] += amount;
    }

    jumpTo({ target : {textContent : timeString} }) {
        return this.goTo(this.serverTime + toSeconds(timeString));
    }

    continueFor({ target : {textContent : timeString} }) {
        return this.goTo(this.selectedTime + toSeconds(timeString));
    }

    changeTime({ target: {seconds} }) {
        this.goTo(seconds);
    }

    restart(evt) {
        this.goTo(this.serverTime);
    }

    get passedSeconds() {
        return this.selectedTime - this.serverTime;
    }

    get passedTime() {
        return toHHMMSS(this.passedSeconds);
    }

    get columns() {
        return (this.hasData) ? Object.values(this.columnsByName) : [];
    }

    get coords() {
        return (this.hasData) ? this.accountState.planets.map(({coords}) => coords) : [];
    }

    get hasData() {
        return (this.columnsByName !== {});
    }

    get colspan() {
        return this.columns.length + 2;
    }

    get start() {
        return (this.hasData) ? new Date(this.serverTime*1000).toLocaleString() : '';
    }

    get serverTime() {
        return ((this.accountState?.serverTime ?? Date.now()) / 1000) | 0;
    }

    formatNumbers(any) {
        const type = trueTypeOf(any);
        if(['Object', 'Array', 'Number'].includes(type)) {
            if(type === 'Object') {
                Object.entries(any).forEach(([key, value]) => {
                    try { any[key] = this.formatNumbers(value) }catch(ignore) {}
                });
            }
            else if(type === 'Array') {
                [...any].forEach((value, index) => any[index] = this.formatNumbers(value));
            }
            else if(type === 'Number') {
                any = any.toLocaleString('de-DE');
            }
        }

        return any;
    }

    num(formattedNumber) {
        return (typeof formattedNumber === 'string')
            ? Number(formattedNumber.replaceAll('.', ''))
            : formattedNumber
    }
}