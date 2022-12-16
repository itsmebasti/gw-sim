import { LightningElement, api, track } from 'lwc';
import { CacheMixin } from 'lwc-base';
import { toHHMMSS } from '../../../classes/framwork/misc/timeConverters';

import technologies from '../../../classes/model/static/technologies';
import { accountState } from '../../../classes/model/infra/uni';
import Account from '../../../classes/model/infra/account'
import Database from '../../../classes/framwork/database/database';
import InfraEvent from '../../../classes/framwork/events/infraEvent';
import { CHANGE, E, FACTORY } from '../../../classes/model/static/types';
import { ResourceError } from '../../../classes/model/resources/resourceStorage';
import ResourceChanges from '../../../classes/model/resources/resourceChanges';
import History from './history';
import { LOG_LEVEL } from '../pathLogger/pathLogger';
import ExecutableAccount from './executableAccount';

export default class Pathfinder extends CacheMixin(LightningElement) {
    database = new Database();
    @api pathDirectionReverse = false;
    
    // IndexedDB data
    savedAccounts;
    savedPaths;
    
    account;
    steps = [];
    selectedStep;
    
    requested = [0, 0, 0, 0];
    
    history = new History();

    @track cache = this.cached({
        selectedAccount: 'Default',
        coords: '1:1:1',
        produce: true,
        logLevel: 'info',
    });

    connectedCallback() {
        this.reload();
        
        document.addEventListener('keydown', (evt) => {
            const componentVisible = (this.template.querySelector('div')?.offsetWidth > 0);
            
            if(componentVisible && evt.ctrlKey) {
                const hotKeyAction = {
                    'z': this.undo,
                    'Z': this.undo,
                    'y': this.redo,
                    'Y': this.redo,
                    's': this.savePath,
                    'S': this.savePath,
                }[evt.key];
            
                if(hotKeyAction) {
                    hotKeyAction();
                    evt.preventDefault();
                }
            }
        });
    }

    @api reload(player = this.cache.selectedAccount) {
        this.database.get('AccountData', player)
            .catch(this.handle)
            .then((state = accountState()) => this.load(state))
            .catch(this.handle)
    }

    load(accountState) {
        this.cache.selectedAccount = accountState.player;
        this.loadStoredData(accountState)
                .then(() => this.loadPlanet(this.cache.coords));
    }

    loadPlanet(coords) {
        this.cache.coords = (this.planets.includes(coords)) ? coords : this.planets[0];
        
        return this.database.get('Paths', this.pathName())
            .catch(this.handle)
            .then((path) => {
                const initialSteps = path?.steps ?? [];
                this.history.switchTo(this.cache.coords, initialSteps);
                this.history.ignoreNextPush();
                this.print(initialSteps);
            })
            .catch(this.handle);
    }

    print(steps, activeStep) {
        try {
            this.account = new ExecutableAccount();
        }
        catch(e) {
            this.handle(e);
            this.load(accountState());
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
    }
    
    preparedAccount() {
        const account = new Account(this.account.state);
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
        
        account.rebaseTo(koloStart);
        
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
            .then((data = []) => this.savedAccounts = data)
            
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
            this.logger().printInfo('Warte auf Ressourcen für ' + construction.type + ' ' + (construction.level+1))
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

    selectLogLevel({ detail: level }) {
        this.cache.logLevel = level;
    }

    selectAccount({ detail: player }) {
        this.reload(player);
    }

    savePath(evt) {
        const name = this.pathName();
        return this.database.upsert('Paths', { name, steps: this.steps })
            .then(() => {
                this.toast('Pfad erfolgreich im Broser gespeichet', 'Tipp - Speichern: [Ctrl + S]' );
                this.loadStoredPaths();
            })
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

    copy(evt) {
        this.clip(pathField.value);
    }

    clip(string) {
        navigator.clipboard.writeText(string)
                 .then(() => this.toast('Erfolgreich kopiert!'))
                 .catch(() => this.error('Fehler beim kopieren!'));
    }

    executePasted() {
        this.steps = [];
        this.print(JSON.parse(this.pathField.value || '[]'));
        this.toast('Pfad wird ausgeführt');
    }
    
    
    // HELPERS

    handle = (error) => {
        console.error(error); 
        (this.baseToast()) ? this.baseToast().display('error', error) : console.error(error);
    }

    error = (error) => {
        this.handle(error);
    }

    toast = (message, details, severity = 'success') => {
        this.baseToast()?.display(severity, message, details);
    }
    
    stopPropagation(evt) {
        evt.stopPropagation();
    }
    
    pathName() {
        return this.account.uni + ' ' + this.account.player + ' ' + this.cache.coords;
    }
    
    baseToast() {
        return this.template.querySelector('base-toast');
    }

    logger() {
        return this.template.querySelector('gw-path-logger');
    }
    
    pathField() {
        return this.template.querySelector('.path');
    }


    // GETTERS
    
    get accountNames() {
        return [...new Set([...this.savedAccounts.map(({ player }) => player), 'Default'])];
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
        
        result.push(...this.account?.coords ?? []);
        result.push(...this.newPlanets ?? []);
        
        return [...new Set(result.map(({coords}) => coords))];
    }
    
    get timePassed() {
        return toHHMMSS(this.account.passed);
    }
    
    get passedTimeClass() {
        return 'slds-align_absolute-center' + (this.pathHasErrors ? ' error' : '');
    }

    get validatedConstructions() {
        const validated = (construction) => ({
            construction, 
            possible: this.account.get(construction).dependencies().every(({ type, level }) => (this.levelFor(type) >= level))
        });
        
        return [
            {label: 'Gebäude', options: technologies.buildings.map(validated) },
            {label: 'Forschung', options: technologies.research.map(validated) },
            {label: 'Schiffe', options: technologies.ships.map(validated) },
            {label: 'Türme', options: technologies.towers.map(validated) },
        ];
    }

    get pathJson() {
        return (this.steps.length) ? JSON.stringify(this.steps) : '';
    }
    
    get generateVariant() {
        return this.cache.produce ? 'neutral' : 'brand';
    }
    
    get produceVariant() {
        return this.cache.produce ? 'brand' : 'neutral';
    }
    
    get completeBuildingPossible() {
        return (this.account.planet.kz.queue.length > 0);
    }
    
    get completeResearchPossible() {
        return (this.account.planet.fz.queue.length > 0);
    }
    
    get completeShipPossible() {
        return (this.account.planet.sf.queue.length > 0);
    }
    
    get completeAllPossible() {
        return (this.completeBuildingPossible || this.completeResearchPossible || this.completeShipPossible);
    }

    get undoDisabled() {
        return !this.history.undoable;
    }

    get redoDisabled() {
        return !this.history.redoable;
    }
}
