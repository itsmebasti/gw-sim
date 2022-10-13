import { LightningElement, track, api } from 'lwc';
import { CacheMixin } from 'lwc-base';
import Database from '../../../classes/framwork/database/database';
import UNI, { accountState } from '../../../classes/model/infra/uni';
import technologies from '../../../classes/model/static/technologies';
import levelFactor from '../../../classes/model/static/levelFactor.json';
import { RESOURCES } from '../../../classes/model/static/types';
import Account from '../../../classes/model/infra/account';

export default class AccountConfig extends CacheMixin(LightningElement) {
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
        this.reload();
    }

    @api reload(player = this.cache.selectedAccount ?? 'Default') {
        this.loadStoredAccounts();
        this.selectAccount({ detail: player });
    }

    loadStoredAccounts() {
        this.savedAccounts = ['Default']
        return this.database.getAll('AccountData')
                   .then((data) => this.savedAccounts = [...new Set([...data.map(({ player }) => player), 'Default'])])
                   .catch(this.handle);
    }

    selectAccount({ detail: player }) {
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

                this.dispatchEvent(new CustomEvent('accountchange', { detail: accountData.player }));
            })
            .catch(this.handle);
    }

    clear(evt) {
        this.database.clear('Fleets').catch(this.handle);
        this.database.clear('AccountData').catch(this.handle);
        this.database.clear('NewPlanets').catch(this.handle);

        this.toast('Daten erfolgreich Gelöscht!');

        this.reload('Default');
    }

    setUni({ detail : name }) {
        this.store(accountState(name));
    }

    changeStart(evt) {
        this.updateServerTime(this.template.querySelector('base-date-time').value);
    }

    resetStart(evt) {
        this.updateServerTime(UNI[this.selectedUni].START_DATE.getTime());
    }

    updateServerTime(value) {
        this.accountData.serverTime = value;
        this.store();
    }

    selectPlanet({ target: {selected} }) {
        this.coords = selected;
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

    get serverTime() {
        return this.accountData?.serverTime;
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
        return UNI.list;
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
            account.current = this.coords;

            this.removedQueueTypes.filter((type) => {
                const construction = account.get(type);
                RESOURCES.forEach((resType) => result[resType] += construction.describe[resType] / 400 * levelFactor.values[construction.level + 1])
            });
        }

        return result;
    }

    get queueUnchanged() {
        return (this.removedQueueTypes.length === 0);
    }

    handle = (error) => {
        this.baseToast ? this.baseToast.display('error', error) : console.error(error);
    }

    error = (error) => {
        this.handle(error);
    }

    toast = (message, details, severity = 'success') => {
        this.baseToast.display(severity, message, details);
    }
    
    get baseToast() {
        return this.template.querySelector('base-toast');
    }
}