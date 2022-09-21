import { track } from 'lwc';
import SldsWebComponent from "../../../classes/framwork/misc/sldsWebComponent";
import Database from '../../../classes/framwork/database/database';
import FleetsHtml from './parser/fleetsHtml';
import LandingHtml from './parser/landingHtml';
import OverviewPage from './parser/overviewPage';
import StatsPage from './parser/statsPage';
import ResearchPage from './parser/researchPage';
import technologies from '../../../classes/model/static/technologies';

export default class Uploads extends SldsWebComponent {
    database = new Database();
    @track times = {};
    
    connectedCallback() {
        this.database.getAll("Raw")
            .then((rawPages) => rawPages.forEach((raw) => this.times[raw.name] = raw.time))
            .catch(this.handle);
    }
    
    upload({ target, target: { id: name, value} }) {
        if(!value) return;
        target.value = "";
        
        const internalPrefix = /-.*/;
        name = name.replace(internalPrefix, "");
        const time = Date.now();
        
        this.database.add("Raw", {name, value, time})
            .then(() => {
                if(name === "landingHtml") {
                    // new FleetsHtml(value).store();
                }
                
                this.times[name] = time;
            })
            .then(() => this.tryGeneratingAccountData())
            .catch(this.handle)
    }
    
    tryGeneratingAccountData() {
        return this.database.getAll("Raw")
            .then((rawPages) => {
                rawPages = rawPages.filter((page) => page.name !== 'landing');
                if(rawPages.length < 5) return;
                
                const find = (name) => rawPages.find((raw) => raw.name === name);
                const overviewString = find("overview");
                const overviewHtml = find("overviewHtml");
                const researchString = find("research");
                const statsString = find("stats");
                const landingHtml = find("landingHtml");
            
                const state = this.accountState(landingHtml.value, overviewString.value, overviewHtml.value, researchString.value, statsString.value);
                this.database.add("AccountData", state)
                    .catch(this.handle);
                this.fireCompleteness(undefined, state.player);
            })
            .catch(this.handle)
    }
    
    accountState(landingHtml, overviewString, overviewHtml, researchString, statsString) {
        const landingPage = new LandingHtml(landingHtml);
        const overview = new OverviewPage(overviewString, overviewHtml);
        const research = new ResearchPage(researchString);
        const stats = new StatsPage(statsString);
    
        const shipQueue = overview.shipQueue();
        
        const planets = overview.planets.map((coords) => {
            const current = [];
            if(landingPage.currentResearch?.coords === coords) {
                current.push(landingPage.currentResearch);
            }
            
            const building = overview.currentBuilding(coords);
            if(Object.keys(building).length > 0) {
                current.push(building);
            }
            
            const planetQueue = shipQueue[coords];
            if(planetQueue) {
                current.push(planetQueue);
            }
            
            const resources = overview.toResoures(coords);
            const queueRes = stats.resFor(coords);
    
            resources.forEach((res, i) => {
                res.stored += queueRes?.[i] ?? 0;
    
                if(planetQueue) {
                    res.stored -= planetQueue.amount * technologies.shipDescribes.find(({type}) => type === planetQueue.type)[res.type];
                }
            })
            
            return {
                coords,
                current,
                infra: overview.toInfra(coords),
                resources,
            };
        });
        
        return {
            uni: landingPage.uni,
            player: landingPage.player,
            serverTime: landingPage.serverTime,
            planets,
            research: research.plain(),
        };
    }
    
    clear(evt) {
        this.database.clear("Raw").catch(this.handle);
        this.database.clear("Fleets").catch(this.handle);
        this.database.clear("AccountData").catch(this.handle);
        this.times = {};
        this.fireCompleteness();
        
        this.toast('Daten erfolgreich Gelöscht!');
    }
    
    fireCompleteness(evt, player) {
        this.dispatchEvent(new CustomEvent("complete", { detail: player, bubbles: true, composed: true}));
    }
    
    copy() {
        navigator.clipboard.writeText(this.template.querySelector('.path').value);
    }
    
    get researchPlaceholder() {
        return this.placeholder("1. Forschung", "research");
    }
    
    get overviewPlaceholder() {
        return this.placeholder("2. Gesamtübersicht", "overview");
    }
    
    get overviewHtmlPlaceholder() {
        return this.placeholder("3. Gesamtübersicht (html)", "overviewHtml");
    }
    
    get statsPlaceholder() {
        return this.placeholder("4. Statistik (Rohstoffe)", "stats");
    }
    
    get landingHtmlPlaceholder() {
        return this.placeholder("5. Flottenübersicht (html)", "landingHtml");
    }
    
    placeholder(name, css_class) {
        return name + "\n(" + ((this.times[css_class]) ? new Date(this.times[css_class]).toLocaleString() : "unbekannt") + ")";
    }
    
    handle = (error) => {
        this.template.querySelector('slds-toast').display('error', error);
    }
    
    error = (error) => {
        this.handle(error);
    }
    
    toast = (message, details) => {
        this.template.querySelector('slds-toast').display('success', message, details);
    }
}