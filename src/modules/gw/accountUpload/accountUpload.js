import { LightningElement } from 'lwc';
import Database from '../../../classes/framwork/database/database';
import UNI from '../../../classes/model/infra/uni';
import InfraEvents from './parser/infraEvents';
import Overview from './parser/overview';
import ResourceStats from './parser/resourceStats';
import Research from './parser/research';
import ServerInfo from './parser/serverInfo';
import Fleets from './parser/fleets';
import technologies from '../../../classes/model/static/technologies';
import { FACTORY } from '../../../classes/model/static/types';
import Account from '../../../classes/model/infra/account';

export default class AccountUpload extends LightningElement {
    database = new Database();

    uni = UNI.list[0];

    upload(evt) {
        const [research, overview, reourceStats, landing] = [...this.template.querySelectorAll('textarea')].map((element) => element.value);

        for(let value of [research, overview, reourceStats, landing]) {
            if(value === '') {
                this.error('Bitte kopiere erst alle vier Seiten in die felder!');
                return;
            }
        }

        try {
            this.store(this.accountStateFor(landing, overview, research, reourceStats));

            new Fleets(landing).store();
        }
        catch(e) {
            this.toast('Daten fehlerhaft!', e.message ?? e, 'error');
            console.error(e);
        }
    }


    accountStateFor(landingDom, overviewDom, researchDom, reourceStatsDom) {
        const serverInfo = new ServerInfo(landingDom);
        const infraEvents = new InfraEvents(landingDom, serverInfo);
        const overview = new Overview(overviewDom);
        const research = new Research(researchDom);
        const reourceStats = new ResourceStats(reourceStatsDom);

        const result = this.synchronizedData(serverInfo, infraEvents, overview, research);

        const planetFor = (toFind) => result.planets.find(({coords}) => coords === toFind);

        infraEvents.research && planetFor(infraEvents.research.coords).current.push(infraEvents.research);
        infraEvents.buildings.forEach((building) => planetFor(building.coords).current.push(building));

        reourceStats.queueResources().forEach((planetQueRes) => {
            const planet = planetFor(planetQueRes.coords);
            const currentShips = planet.current.find(({factory}) => factory === FACTORY.SF);
            const currentShipsInfo = technologies.shipDescribes.find(({type}) => type === currentShips?.type);

            planetQueRes.queueRes.forEach((res, i) => {
                const planetRes = planet.resources[i];
                planetRes.stored += res - (currentShipsInfo?.[planetRes.type] ?? 0);
            });
        });

        return result;
    }

    synchronizedData(serverInfo, infraEvents, overview, research) {
        let accountData = {
            uni: serverInfo.uni,
            player: serverInfo.player,
            serverTime: serverInfo.serverTime,
            planets: overview.planets,
            research: research.plain()
        };

        const nextBuilding = infraEvents.buildings[0];

        if(nextBuilding) {
            const sameBuildingFinishiInOverview = overview.buildingTimeLeft(nextBuilding.coords, this.template.querySelector('p.temp'));

            const uploadSecondsDiff = sameBuildingFinishiInOverview - nextBuilding.timeLeft;

            if(uploadSecondsDiff < 0) {
                throw 'Bitte halte die reihenfolge beim öffnen der quellen ein!';
            }
            else if(uploadSecondsDiff > 0) {
                accountData.serverTime = serverInfo.serverTime - uploadSecondsDiff*1000;
                const overviewAccount = new Account(accountData);
                overviewAccount.continue(uploadSecondsDiff);

                accountData = overviewAccount.state;
            }
        }

        return accountData;
    }

    store(accountData) {
        this.database.add('AccountData', new Account(accountData).state)
            .then(() => {
                this.toast(accountData.player + ' Account erfolgreich hochgeladen');

                this.dispatchEvent(new CustomEvent('accountchange', { detail: accountData.player, bubbles: true, composed: true }));
            })
            .catch(this.handle);
    }

    pasteDom(evt) {
        evt.preventDefault();
        evt.target.value = evt.clipboardData.getData('text/html');
        
        this.selectNext(evt);
    }
    
    selectNext(evt) {
        if(evt.target.nextSibling) {
            evt.target.nextSibling.focus();
        }
        else {
            this.template.querySelector('lightning-button.upload').focus();
        }
    }
    
    clear(evt) {
        this.template.querySelectorAll('textarea').forEach((element) => element.value = "");
    }

    setUni({ detail : name }) {
        this.uni = name;
    }

    // Getters

    get unis() {
        return UNI.list;
    }

    get urls() {
        return {
            research: `https://${this.uni}.gigrawars.de/game_research_index/`,
            overview: `https://${this.uni}.gigrawars.de/game_empire_index/`,
            resources: `https://${this.uni}.gigrawars.de/game_statistic_resource/`,
            landing: `https://${this.uni}.gigrawars.de/game_dashboard_index/`
        }
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