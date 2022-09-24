import { LightningElement, track } from 'lwc';
import Database from '../../../classes/framwork/database/database';
import Landing from './parser/landing';
import Overview from './parser/overview';
import ResourceStats from './parser/resourceStats';
import Research from './parser/research';
import technologies from '../../../classes/model/static/technologies';
import { FACTORY } from '../../../classes/model/static/types';
import toHHMMSS from '../../../classes/framwork/misc/toHHMMSS';

export default class Uploads extends LightningElement {
    database = new Database();

    @track latestUpload;

    @track savedAccounts;
    selectedAccount = 'Default';

    connectedCallback() {
        this.database.get("AccountData", this.selectedAccount)
            .then((account) => this.latestUpload = toHHMMSS(account?.serverTime))
            .catch(this.handle);

        this.loadStoredAccounts();
    }


    pasteDom(evt) {
        evt.preventDefault();
        evt.target.value = evt.clipboardData.getData('text/html');

        evt.target.nextSibling.focus();
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
            this.database.add("AccountData", this.accountState(landing, overview, research, reourceStats))
                .then(() => this.toast("Account erfolgreich hochgeladen, seite neu laden!"))
                .catch(this.handle);
        }
        catch(e) {
            this.error('Daten fehlerhaft!')
        }
    }


    accountState(landingDom, overviewDom, researchDom, reourceStatsDom) {
        const landing = new Landing(landingDom);
        const overview = new Overview(overviewDom, this.template.querySelector('p.temp'));
        const research = new Research(researchDom);
        const reourceStats = new ResourceStats(reourceStatsDom);

        const planets = overview.planets;

        const planetFor = (toFind) => planets.find(({coords}) => coords === toFind);

        if(landing.research) {
            planetFor(landing.research.coords).current.push(landing.research)
        }

        reourceStats.queueResources().forEach((planetQueRes) => {
            const planet = planetFor(planetQueRes.coords);
            const currentShips = planet.current.find(({factory}) => factory === FACTORY.SF);
            const currentShipsInfo = technologies.shipDescribes.find(({type}) => type === currentShips?.type);

            planetQueRes.queueRes.forEach((res, i) => {
                const planetRes = planet.resources[i];

                planetRes.stored += res;

                if(currentShips) {
                    planetRes.stored -= currentShips.amount * currentShipsInfo[planetRes.type];
                }
            });
        });

        return {
            uni: landing.uni,
            player: landing.player,
            serverTime: landing.serverTime,
            planets,
            research: research.plain(),
        };
    }

    loadStoredAccounts() {
        this.savedAccounts = ['Default']
        return this.database.getAll('AccountData')
                   .then((data) => this.savedAccounts = [...new Set([...data.map(({ player }) => player), 'Default'])])
                   .catch(this.handle);
    }

    selectAccount({ detail: player }) {
        this.selectedAccount = player;
    }

    uploadAccount({ target, target: {value} }) {
        if(!value) return;
        target.value = "";

        try {
            const account = JSON.parse(value);
            this.database.add("AccountData", account)
                .then(() => this.toast(account.player + ' account erfolgreich hochgeladen'))
                .catch(this.handle);
        }
        catch(e) {
            this.error('Kein valider Account');
        }
    }

    copyAccount(evt) {
        this.clip(JSON.stringify(this.accountState));
    }

    clip(string) {
        navigator.clipboard.writeText(string)
                 .then(() => this.toast('Erfolgreich kopiert!'))
                 .catch(() => this.error('Fehler beim kopieren!'));
    }

    clear(evt) {
        this.database.clear("Raw").catch(this.handle);
        this.database.clear("Fleets").catch(this.handle);
        this.database.clear("AccountData").catch(this.handle);
        this.times = {};

        this.toast('Daten erfolgreich Gelöscht!');
    }

    copy() {
        navigator.clipboard.writeText(this.template.querySelector('.path').value);
    }

    handle = (error) => {
        this.template.querySelector('base-toast').display('error', error);
    }

    error = (error) => {
        this.handle(error);
    }

    toast = (message, details) => {
        this.template.querySelector('base-toast').display('success', message, details);
    }
}