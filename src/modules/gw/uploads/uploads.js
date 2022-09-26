import { LightningElement, track } from 'lwc';
import { CacheMixin } from 'lwc-base';
import Database from '../../../classes/framwork/database/database';
import UNI, { accountState } from '../../../classes/model/infra/uni';
import Landing from './parser/landing';
import Overview from './parser/overview';
import ResourceStats from './parser/resourceStats';
import Research from './parser/research';
import Fleets from './parser/fleets';
import technologies from '../../../classes/model/static/technologies';
import levelFactor from '../../../classes/model/static/levelFactor.json';
import { FACTORY, RESOURCES } from '../../../classes/model/static/types';
import Account from '../../../classes/model/infra/account';

export default class Uploads extends CacheMixin(LightningElement) {
    database = new Database();
    @track savedAccounts;

    latestUpload;
    @track accountData;
    _coords;

    @track removedQueueTypes = [];

    @track cache = this.cached({
        selectedAccount: 'Default',
    });

    connectedCallback() {
        this.loadStoredAccounts();
        this.selectAccount();
    }

    loadStoredAccounts() {
        this.savedAccounts = ['Default']
        return this.database.getAll('AccountData')
                   .then((data) => this.savedAccounts = [...new Set([...data.map(({ player }) => player), 'Default'])])
                   .catch(this.handle);
    }

    selectAccount({ detail: player } = { detail: this.cache.selectedAccount}) {
        this.database.get('AccountData', player)
            .then((accountData) => {
                accountData = accountData ?? accountState(UNI.default.NAME);

                this.cache.selectedAccount = player;
                this.coords = accountData.planets[0].coords;
                this.accountData = new Account(accountData).state;
                this.latestUpload = new Date(accountData.serverTime)
                            .toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit', hour:'2-digit', minute: '2-digit', second: '2-digit' });
            })
            .catch(this.handle);
    }

    upload(evt) {
        const [research, overview, reourceStats, landing] = [...this.template.querySelectorAll('textarea.upload')].map((element) => element.value);

        for(let value of [research, overview, reourceStats, landing]) {
            if(value === '') {
                this.error('Bitte kopiere erst alle vier Seiten in die felder!');
                return;
            }
        }

        try{
            this.store(this.accountStateFor(landing, overview, research, reourceStats));
            // new Fleets(landing).store();
        }
        catch(e) {
            this.error('Daten fehlerhaft!', e, 'error');
        }
    }


    accountStateFor(landingDom, overviewDom, researchDom, reourceStatsDom) {
        const landing = new Landing(landingDom);
        const overview = new Overview(overviewDom);
        const research = new Research(researchDom);
        const reourceStats = new ResourceStats(reourceStatsDom);

        const planets = overview.planets;
        const { timeLeft, coords } = landing.buildings[0];
        const sameBuildingFinishiInOverview = overview.buildingTimeLeft(coords, this.template.querySelector('p.temp'));

        const uploadSecondsDiff = sameBuildingFinishiInOverview - timeLeft;

        if(uploadSecondsDiff < 0) {
            throw 'Bitte halte die reihenfolge beim öffnen der quellen ein!'
        }

        const overviewAccount = new Account({
            uni: landing.uni,
            player: landing.player,
            serverTime: landing.serverTime - uploadSecondsDiff,
            planets,
            research: research.plain()
        });

        overviewAccount.continue(uploadSecondsDiff);

        const result = overviewAccount.state;
        const planetFor = (toFind) => result.planets.find(({coords}) => coords === toFind);

        landing.research && planetFor(landing.research.coords).current.push(landing.research);
        landing.buildings.forEach((building) => planetFor(building.coords).current.push(building));

        reourceStats.queueResources().forEach((planetQueRes) => {
            const planet = planetFor(planetQueRes.coords);
            const currentShips = planet.current.find(({factory}) => factory === FACTORY.SF);
            const currentShipsInfo = technologies.shipDescribes.find(({type}) => type === currentShips?.type);

            planetQueRes.queueRes.forEach((res, i) => {
                const planetRes = planet.resources[i];
                planetRes.stored += res - currentShipsInfo[planetRes.type] ?? 0;
            });
        });

        return result;
    }

    uploadFullAccount(evt) {
        const textarea = this.template.querySelector('lightning-textarea.json');
        if(textarea.value) {
            try {
                this.store(JSON.parse(textarea.value));
            }
            catch(e) {
                this.error('Kein valider Account');
            }
        }
    }

    store(accountData = this.accountData) {
        this.database.add('AccountData', new Account(accountData).state)
            .then(() => {
                this.toast(accountData.player + ' Account erfolgreich hochgeladen');
                this.loadStoredAccounts();
                this.selectAccount({detail: accountData.player});

                this.dispatchEvent(new CustomEvent('datachange', { detail: accountData.player }));
            })
            .catch(this.handle);
    }

    clear(evt) {
        this.database.clear('Fleets').catch(this.handle);
        this.database.clear('AccountData').catch(this.handle);

        this.loadStoredAccounts();
        this.selectAccount({detail: 'Default'});

        this.toast('Daten erfolgreich Gelöscht!');
    }

    pasteDom(evt) {
        evt.preventDefault();
        evt.target.value = evt.clipboardData.getData('text/html');

        evt.target.nextSibling.focus();
    }

    setUni({ detail : name }) {
        this.store(accountState(name));
    }

    changeTime(evt) {
        const dateControl = this.template.querySelector('input.date');
        const timeControl = this.template.querySelector('input.time');
        const date = new Date(dateControl.valueAsNumber + timeControl.valueAsNumber);

        this.serverTime = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
    }

    resetTime(evt) {
        this.serverTime = UNI[this.selectedUni].START_DATE.getTime();
    }

    set serverTime(value) {
        this.accountData.serverTime = value;
        this.store();
    }

    setPlanet({details: coords}) {
        this.coords = coords;
    }

    set coords(value) {
        this._coords = value;
        this.abortQueueCleanup();
    }

    cleanupQueue({ target: { label: construction } }) {
        this.removedQueueTypes.push(construction);
    }

    acceptQueueCleanup(evt) {
        const planet = this.accountData.planets.find(({coords}) => coords === this.coords);

        planet.current = planet.current.filter(({type}) => !this.removedQueueTypes.includes(type));
        const cleanupRes = this.queueCleanupRes;

        planet.resources.forEach((resource) => resource.stored += cleanupRes[resource.type]);

        this.store();
    }

    abortQueueCleanup(evt) {
        this.removedQueueTypes = [];
    }


    // Getters

    get coords() {
        return this._coords;
    }

    get date() {
        return this.startDate?.toISOString().slice(0,10)
    }

    get time() {
        return this.startDate?.toLocaleTimeString('de-DE');
    }

    get startDate() {
        return this.accountData && new Date(this.accountData.serverTime);
    }

    get defaultSelected() {
        return (this.cache.selectedAccount === 'Default');
    }

    get selectedUni() {
        return this.accountData?.uni;
    }

    get beautifiedJson() {
        return JSON.stringify(this.accountData, null, 4);
    }

    get unis() {
        return ['uni4', 'uni3', 'speed3'];
    }

    get planets() {
        return this.accountData?.planets.map(({coords}) => coords) ?? [];
    }

    get queueItems() {
        return this.accountData?.planets
            .find(({coords}) => coords === this.coords).current
            .map(({type}) => type)
            .filter((type) => !this.removedQueueTypes.includes(type)) ?? [];
    }

    get queueCleanupRes() {
        const result = { fe: 0, lut: 0, h2o: 0, h2: 0 };

        if(this.accountData) {
            const account = new Account(this.accountData);

            technologies.all
                .filter(({type}) => this.removedQueueTypes.includes(type))
                .forEach((info) => {
                    RESOURCES.forEach((resType) => result[resType] += info[resType] / 400 * levelFactor.values[account.level(info.type) + 1])
                });
        }

        return result;
    }

    handle = (error) => {
        this.template.querySelector('base-toast').display('error', error);
    }

    error = (error) => {
        this.handle(error);
    }

    toast = (message, details, severity = 'success') => {
        this.template.querySelector('base-toast').display(severity, message, details);
    }
}