import { LightningElement, api, track } from 'lwc';
import { CacheMixin } from 'lwc-base';
import { toHHMMSS } from '../../../classes/framwork/misc/timeConverters';

import technologies from '../../../classes/model/static/technologies';
import UNI, { accountState } from '../../../classes/model/infra/uni';
import Account from '../../../classes/model/infra/account'
import Database from '../../../classes/framwork/database/database';
import InfraEvent from '../../../classes/framwork/events/infraEvent';
import { CHANGE, E, FACTORY } from '../../../classes/model/static/types';
import { ResourceError } from '../../../classes/model/resources/resourceStorage';
import ResourceChanges from '../../../classes/model/resources/resourceChanges';
import History from './history';
import { LOG_LEVEL } from '../pathLogger/pathLogger';

export default class Pathfinder extends CacheMixin(LightningElement) {
    database = new Database();
    
    constructions = [];
    @api pathDirectionReverse = false;
    @track savedAccounts;
    @track savedPaths;
    @track accountState;
    newPlanets;
    resFleets;
    koloFleets;
    selectedPath;
    account;

    steps = [];
    selectedStep;
    
    history = new History();
    
    @track requested = [0, 0, 0, 0];
    timePassed = '00:00:00';
    pathHasErrors = false;
    produceResForNextBuild = true;

    @track cache = this.cached({
        selectedAccount: 'Default',
        coords: '1:1:1',
        produce: true,
        logLevel: 'info',
    });
    
    stopPropagation(evt) {
        evt.stopPropagation();
    }

    connectedCallback() {
        document.addEventListener('keydown', (evt) => {
            const componentVisible = (this.template.querySelector('div')?.offsetWidth > 0);
            if(!componentVisible) return;
            
            if (evt.ctrlKey) {
                switch(evt.key) {
                    case 'z': case 'Z':
                        this.undo();
                        evt.preventDefault();
                        break;
                    case 'y': case 'Y':
                        this.redo()
                        evt.preventDefault();
                        break;
                    case 's': case 'S':
                        this.savePath()
                        evt.preventDefault();
                        break;
                }
            }
            else if( !['INPUT', 'TEXTAREA'].includes(this.template.activeElement?.tagName)) {
                switch(evt.key) {
                    case 'ArrowRight': case 'd': case 'D':
                        this.template.querySelector('gw-planet-selector').next();
                        break;
                    case 'ArrowLeft': case 'a': case 'A':
                        this.template.querySelector('gw-planet-selector').previous();
                        break;
                }
            }
        });

        this.reload();
    }

    @api reload(player = this.cache.selectedAccount ?? 'Default') {
        this.database.get('AccountData', player)
            .then((state) => this.load(state ?? accountState(UNI.default.NAME)))
            .catch((e) => {
                console.error(e);
                this.load(accountState(UNI.default.NAME));
            });
    }

    load(accountState) {
        this.accountState = accountState;
        this.cache.selectedAccount = accountState.player;
        this.loadStoredData(accountState)
                .then(() => this.loadPlanet(this.cache.coords));
    }

    loadPlanet(coords) {
        this.cache.coords = (this.planets.includes(coords)) ? coords : this.planets[0];
        
        this.selectedPath = this.accountState.uni + ' ' + this.cache.selectedAccount + ' ' + this.cache.coords;
        
        return this.database.get('Paths', this.selectedPath)
        .catch((error) => {
            this.handle(error);
            return this.steps;
        })
            .then((path) => {
                const initialPath = path?.steps ?? [];
                this.history.switchTo(this.cache.coords, initialPath);
                this.history.ignoreNextPush();
                this.print(initialPath);
            })
            .catch(this.handle);
    }

    print(steps, activeStep) {
        try {
            this.account = this.preparedAccount(this.accountState);
        }
        catch(e) {
            this.handle(e);
            this.load(accountState(UNI.default.NAME));
            return;
        }
        
        this.selectedStep = activeStep;
        
        this.requested = [0, 0, 0, 0];
        this.steps = steps;
        
        this.history.push(steps);

        this.logger.reset(this.account);
        this.account.subscribe(E.FAILED, () => this.pathHasErrors = true, this.account.current);
        this.account.subscribe(E.REDUCED_H2_PROD, () => this.pathHasErrors = true, this.account.current);
        this.account.subscribe(E.RESOURCE_REQUEST, this.handleResourceRequest, this.account.current);
        
        this.pathHasErrors = false;
        steps.forEach(this.execute);

        if(steps.length === 0) {
            this.updateUI();
        }
    }
    
    preparedAccount(state) {
        const account = new Account(state);
        account.current = this.cache.coords;
        
        let koloStart;
        const newPlanet = this.newPlanets?.find(({coords}) => coords === this.cache.coords);
        if(newPlanet) {
            koloStart = newPlanet.startTime - (account.serverTime/1000);
            
            if(koloStart < 0) {
                this.error('Kolonisation muss in der Zukunft liegen!');
                koloStart = 0;
            }
            
            account.register(new InfraEvent(E.NEW_PLANET, newPlanet), {time: koloStart});
        }

        this.resFleets?.forEach((fleet) => {
            const time = fleet.delivery.time - account.serverTime/1000;
            const resourceChanges = new ResourceChanges(...Object.values(fleet.res), this.resChangeType(fleet));

            account.register(new InfraEvent(E.RESOURCE_CHANGE, { resourceChanges }, fleet.delivery.planet.coords), {time});
        });
        
        if(koloStart !== undefined) {
            account.continue(koloStart);
            account.serverTime += account.passed * 1000;
            account.passed = 0;
        }
        
        return account;
    }

    resChangeType({mission, source, target, friendly}) {
        return (mission === 'Transport' && source.isOwnPlanet) ? CHANGE.TRANSPORT :
                (mission === 'Stationierung') ? CHANGE.TRANSPORT :
                (friendly && !target.exists) ? CHANGE.TRANSPORT :
                (!friendly && source.isOwnPlanet) ? CHANGE.FARM :
                (mission === 'Transport' && !source.isOwnPlanet) ? CHANGE.TRADE :
                (mission === 'Transport' && !target.isOwnPlanet && target.exists) ? CHANGE.TRADE_OUT : '';
    }

    add(step) {
        const position = (this.selectedStep === undefined) ? this.steps.length : this.selectedStep + 1;
        this.steps.splice(position, 0, step);
        this.print(this.steps, position);
    }

    
    // steps

    applyManualChanges(evt) {
        const timeInput = this.template.querySelector('.wait');
        const values = Array.from(this.template.querySelectorAll('input.res')).map(({ value }) => parseInt(value) || 0);
        if(values.some((v) => v !== 0)) {
            this.add({ type: 'res', values });
        }
        if(timeInput.valueAsNumber > 0) {
            this.add({ type: 'wait', seconds: timeInput.valueAsNumber / 1000 });
        }
    }

    build(evt) {
        this.add({ type: 'start', tec: evt.target.innerText, produce: this.cache.produce });
    }

    completeAll(evt) {
        this.add({ type: 'complete' });
    }

    completeBuilding(evt) {
        this.add({ type: 'complete', factory: FACTORY.KZ });
    }

    completeResearch(evt) {
        this.add({ type: 'complete', factory: FACTORY.FZ });
    }

    completeShip(evt) {
        this.add({ type: 'complete', factory: FACTORY.SF });
    }

    resetCount() {
        this.add({ type: 'resetCount' });
    }

    execute = (step) => {
        try {
            switch (step.type) {
                case 'res':
                    this.logger.command('Res: ' + step.values);
                    this.account.addResources(step.values);
                    this.logger.markAsSucceeded();
                    break;
                case 'start':
                    this.produceResForNextBuild = step.produce ?? true;
                    this.logger.command('Starte ' + step.tec + ' ' + (this.levelFor(step.tec) + 1), this.buildSettings(this.produceResForNextBuild));
                    this.account.completeAndEnqueue(step.tec);
                    this.produceResForNextBuild = true;
                    break;
                case 'wait':
                    this.logger.command('Warten ' + toHHMMSS(step.seconds));
                    this.account.continue(step.seconds);
                    break;
                case 'complete':
                    if(step.factory) {
                        this.logger.command(step.factory + ': Auftrag abschließen');
                        this.account.complete(step.factory);
                    }
                    else {
                        this.logger.command('Alle Aufträge abschließen');
                        this.account.completeAllOn(this.cache.coords);
                    }
                    break;
                case 'resetCount':
                    this.logger.command('Bis hier werden (' + this.generated + ') benötigt');
                    this.requested = [0, 0, 0, 0];
                    break;
            }
        }
        catch(error) {
            if(error instanceof ResourceError) {
                this.logger.markAsRejected();
            }
            this.pathHasErrors = true;
            this.logger.printError(error);
        }

        this.updateUI();
    }

    buildSettings(produceResForNextBuild) {
        return [
            produceResForNextBuild && { action: 'generateRes', tooltip: "Rostoffe werden selbst produziert", color:"yellow", icon: 'utility:clock' },
            !produceResForNextBuild && { action: 'produceRes', tooltip: "Rostoffe werden anderweitig beschafft", color:"green", icon: 'utility:add' },
        ].filter(Boolean)
    }

    handleSettingClick({detail: {action, id}}) {
        switch (action) {
            case 'generateRes':
                this.steps[id].produce = false;
                break;
            case 'produceRes':
                this.steps[id].produce = true;
                break;
        }

        this.print(this.steps, id);
    }

    levelFor(tech) {
        const construction = this.account.get(tech);
        return construction.level + this.account.get(construction.factoryType).queue.filter(({type}) => type === tech).length;
    }


    // Step re-ordering

    jumpTo(evt) {
        const steps = this.steps;
        steps.splice(evt.detail.id + 1);
        this.print(steps, this.steps.length - 1);
    }

    startFrom(evt) {
        const steps = this.steps;
        steps.splice(0, evt.detail.id);
        this.print(steps, 0);
    }

    remove(evt) {
        const steps = this.steps;
        steps.splice(evt.detail.id, 1);
        this.print(steps);
    }

    move({ detail: { commandIndex, newIndex, tec } }) {
        const command = (tec) ? { type: 'start', tec, produce: this.cache.produce } : this.steps[commandIndex];
        
        tec || this.steps.splice(commandIndex, 1);
        this.steps.splice(newIndex, 0, command);
        
        this.print(this.steps, newIndex);
    }

    duplicate({ detail: {id} }) {
        this.steps.splice(id, 0, {...this.steps[id]});
        this.print(this.steps, id + 1);
    }

    loadStoredPaths() {
        return this.database.getAll('Paths')
                   .then((paths = []) => this.savedPaths = paths.map(({ name }) => name))
                   .catch(this.handle);
    }

    loadStoredData(accountState) {
        return this.loadStoredPaths()
            .then(() => this.database.getAll('AccountData'))
            .then((data = []) => this.savedAccounts = [...new Set([...data.map(({ player }) => player), 'Default'])])
            
            .then(() => this.database.getAllBy('Fleets', 'deliveryTime', IDBKeyRange.lowerBound(accountState.serverTime/1000)))
            .then((fleets = []) => fleets.filter(({account}) => (account === accountState.player)))
            .then((fleets) => {
                this.resFleets = fleets.filter(({delivery, newKolo}) => delivery?.planet.isOwnPlanet || newKolo);
                
                this.newPlanets = fleets.filter(({newKolo}) => (newKolo))
                                        .map(({deploy}) => ({ startTime: deploy.time, coords: deploy.planet.coords }));
            })
            
            .then(() => this.database.get('NewPlanets', accountState.player))
            .then(({planets} = {planets: []}) => {
                planets.filter(({coords}) => !this.planets.includes(coords))
                    .forEach(({coords, startTime}) => {
                        this.newPlanets.push({coords, startTime: startTime/1000})
                    });
            })
            
            .catch(this.handle);
    }


    // Infra event handler

    handleResourceRequest = ({ resources: resourceChanges, construction }) => {
        if (this.produceResForNextBuild) {
            this.logger.printInfo('Warte auf Ressourcen für ' + construction.type + ' ' + (construction.level+1))
        }
        else {
            this.account.publish(new InfraEvent(E.RESOURCE_CHANGE, {resourceChanges: resourceChanges.clone(CHANGE.GENERATED)}, this.cache.coords));

            const res = resourceChanges.values.map(({ amount }) => Math.ceil(amount));

            for (let i = 0; i < 4; i++) {
                this.requested[i] += res[i];
            }
        }
    }


    // Event handler
    
    selectStep({ detail: commandId }) {
        this.selectedStep = commandId;
    }

    drag(evt) {
        const tec = evt.currentTarget.innerText;
        evt.dataTransfer.setData('tec', tec);
    }

    selectPath({ detail: name }) {
        this.selectedPath = name;
    }
    
    selectLogLevel({ detail: level }) {
        this.cache.logLevel = level;
    }

    selectAccount({ detail: player }) {
        this.reload(player);
    }

    savePath(evt) {
        const name = this.template.querySelector('.path-name').value;

        return this.database.upsert('Paths', { name, steps: this.steps })
            .then(() => {
                this.toast('Pfad erfolgreich im Broser gespeichet', '[' + name + '] - [Ctrl + S]' );
                this.selectedPath = name;
                this.loadStoredPaths();
            })
            .catch(this.handle);
    }

    loadPath(evt) {
        return this.database.get('Paths', this.selectedPath)
                   .catch((error) => {
                       this.handle(error);
                       this.print(this.steps);
                   })
                   .then((path) => this.print(path?.steps ?? []))
                   .then(() => this.toast('Pfade geladen und ausgeführt'))
                   .catch(this.handle);
    }

    deletePath(evt) {
        return this.database.delete('Paths', this.selectedPath)
                   .then(() => {
                        this.loadStoredPaths();
                        this.toast('Pfad gelöscht');
                   })
                   .catch(this.handle);
    }

    deletePaths(evt) {
        return this.database.clear('Paths')
                   .then(() => this.loadStoredPaths())
                   .then(() => this.toast('Alle Pfade gelöscht'))
                   .catch(this.handle);
    }

    selectPlanet({target:{selected}}) {
        this.savePath()
            .then(() => this.loadPlanet(selected))
    }

    reset(evt) {
        this.print([]);
    }

    undo(evt) {
        if(this.undoDisabled) {
            this.error('Ende der Pfad history');
            return;
        }
        
        this.history.ignoreNextPush();
        this.print(this.history.back());
    }

    redo(evt) {
        if(this.redoDisabled) {
            this.error('Keine weiteren Pfade');
            return;
        }
        
        this.history.ignoreNextPush();
        this.print(this.history.forth());
    }

    produceRes(evt) {
        this.cache.produce = true;
        evt.target.blur();
    }

    generateRes(evt) {
        this.cache.produce = false;
        evt.target.blur();
    }
    
    updateUI() {
        this.updateJsonOutput();
        this.updateLinkValidity();
        this.timePassed = toHHMMSS(this.account.passed);
    }

    updateJsonOutput() {
        this.template.querySelector('.path').value = (this.steps.length) ? JSON.stringify(this.steps) : '';
    }

    updateLinkValidity() {
        const validated = (construction) => ({
            construction,
            possible: this.account.get(construction).dependencies().every(({ type, level }) => (this.levelFor(type) >= level))
        });
        
        this.constructions = [
            {label: 'Gebäude', options: technologies.buildings.map(validated) },
            {label: 'Forschung', options: technologies.research.map(validated) },
            {label: 'Schiffe', options: technologies.ships.map(validated) },
            {label: 'Türme', options: technologies.towers.map(validated) },
        ];
        
        this.completeBuildingPossible = (this.account.planet.kz.queue.length > 0);
        this.completeResearchPossible = (this.account.planet.fz.queue.length > 0);
        this.completeShipPossible = (this.account.planet.sf.queue.length > 0);
        this.completeAllPossible = (this.completeBuildingPossible || this.completeResearchPossible || this.completeShipPossible);
    }

    copy(evt) {
        this.clip(this.template.querySelector('.path').value);
    }

    clip(string) {
        navigator.clipboard.writeText(string)
                 .then(() => this.toast('Erfolgreich kopiert!'))
                 .catch(() => this.error('Fehler beim kopieren!'));
    }

    executePasted() {
        this.steps = [];
        this.print(JSON.parse(this.template.querySelector('.path').value || '[]'));
        this.toast('Pfad wird ausgeführt');
    }


    // Getters
    
    get generateVariant() {
        return this.cache.produce ? 'neutral' : 'brand';
    }
    
    get produceVariant() {
        return this.cache.produce ? 'brand' : 'neutral';
    }
    
    get logLevels() {
        return Object.values(LOG_LEVEL);
    }

    get resources() {
        return this.account?.planet.resources.printable
                .map((res, i) => (res.open = this.requested[i].toLocaleString('de-DE'), res)) ?? [];
    }

    get generated() {
        return this.requested.map((res) => res.toLocaleString('de-DE')).join(' | ');
    }

    get planets() {
        const result = [];
        
        result.push(...this.accountState?.planets ?? []);
        result.push(...this.newPlanets ?? []);
        
        return [...new Set(result.map(({coords}) => coords))];
    }

    get logger() {
        return this.template.querySelector('gw-path-logger');
    }

    get undoDisabled() {
        return !this.history.undoable;
    }

    get redoDisabled() {
        return !this.history.redoable;
    }
    
    get passedTimeClass() {
        return 'slds-align_absolute-center' + (this.pathHasErrors ? ' error' : '');
    }

    handle = (error) => {
        console.error(error);
        (this.baseToast) ? this.baseToast.display('error', error) : console.error(error);
    }

    error = (error) => {
        this.handle(error);
    }

    toast = (message, details, severity = 'success') => {
        this.baseToast?.display(severity, message, details);
    }
    
    get baseToast() {
        return this.template.querySelector('base-toast');
    }
}
