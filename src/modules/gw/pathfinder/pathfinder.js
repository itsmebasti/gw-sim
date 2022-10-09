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

export default class Pathfinder extends CacheMixin(LightningElement) {
    database = new Database();
    
    constructions = [];
    @api pathDirectionReverse = false;
    @track savedAccounts;
    @track savedPaths;
    @track accountState;
    resFleets;
    selectedPath;
    account;

    steps = [];
    history = {};
    pointer = -1;
    timeTraveling = false;
    pathHasErrors = false;

    @track requested = [0, 0, 0, 0];
    timePassed = '00:00:00';
    produceResForNextBuild = true;

    @track cache = this.cached({
        selectedAccount: 'Default',
        coords: '1:1:1',
        produce: true,
        hideDetails: false,
        inlineDetails: false,
    });

    connectedCallback() {
        document.addEventListener('keydown', (evt) => {
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
            else {
                switch(evt.key) {
                    case 'ArrowRight': case 'd': case 'D':
                        this.nextPlanet();
                        break;
                    case 'ArrowLeft': case 'a': case 'A':
                        this.previousPlanet();
                        break;
                }
            }
        });

        this.reload();
    }

    @api reload(player = this.cache.selectedAccount ?? 'Default') {
        this.loadStoredAccounts()
            .then(() => this.loadStoredPaths())
            .then(() => this.loadStoredPlanets(player))
            .then(() => this.database.get('AccountData', player))
            .then((state) => this.load(state ?? accountState(UNI.default.NAME)))
            .catch((e) => {
                console.error(e); 
                this.load(accountState(UNI.default.NAME));
            });
    }

    async load(accountState) {
        this.accountState = accountState;
        this.cache.selectedAccount = accountState.player;

        await this.database.getAllBy('Fleets', 'deliveryTime', IDBKeyRange.lowerBound(accountState.serverTime/1000))
                    .then((resFleets) => this.resFleets = resFleets
                            ?.filter(({player, havingRes, delivery: {planet: {isOwnPlanet}}}) => havingRes && isOwnPlanet && player === this.cache.selectedAccount));

        this.loadPlanet(this.cache.coords);
    }

    print(steps) {
        try {
            this.account = this.preparedAccount(this.accountState);
        }
        catch(e) {
            this.handle(e);
            this.load(accountState(UNI.default.NAME));
            return;
        }
        
        this.account.subscribe(E.FAILED, () => this.pathHasErrors = true, this.account.current);
        this.account.subscribe(E.RESOURCE_REQUEST, this.handleResourceRequest, this.account.current);
        
        this.requested = [0, 0, 0, 0];
        this.steps = [];
        this.steps = steps;
        this.updateHistory();

        this.logger.reset(this.account);
        this.pathHasErrors = false;
        steps.forEach(this.execute);

        if(steps.length === 0) {
            this.updateUI();
        }
    }
    
    preparedAccount(state) {
        const account = new Account(state);
        
        account.current = this.cache.coords;

        this.resFleets?.forEach((fleet) => {
            const time = fleet.delivery.time - account.serverTime/1000;
            const resourceChanges = new ResourceChanges(...Object.values(fleet.res), this.resChangeType(fleet));

            account.register(new InfraEvent(E.RESOURCE_CHANGE, { resourceChanges }, fleet.delivery.planet.coords), {time});
        })
        
        const newPlanet = this.newPlanets?.planets.find(({coords}) => coords === this.cache.coords);
        if(newPlanet) {            
            let time = (newPlanet.startTime - account.serverTime)/1000;
            
            if(time < 0) {
                this.error('Kolonisation muss in der Zukunft liegen!');
                time = 0;
            }
            
            account.register(new InfraEvent(E.NEW_PLANET, newPlanet), {time});
            account.continue(time);
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
        this.steps.push(step);
        this.updateHistory();
        this.execute(step);
    }

    updateHistory() {
        const initial = (this.steps.length === 0 && this.changeHistory.length === 0);

        if(!initial && !this.timeTraveling) {
            this.changeHistory.splice(++this.pointer, Infinity, Object.freeze([...this.steps]));
        }

        this.timeTraveling = false;
    }

    resetHistory() {
        this.history = {};
        this.pointer = -1;
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

        this.print(this.steps)
    }

    levelFor(tech) {
        const construction = this.account.get(tech);
        return construction.level + this.account.get(construction.factoryType).queue.filter(({type}) => type === tech).length;
    }


    // Step re-ordering

    drag(evt) {
        const tec = evt.currentTarget.innerText;
        evt.dataTransfer.setData('tec', tec);
    }

    jumpTo(evt) {
        const steps = this.steps;
        steps.splice(evt.detail.id + 1);
        this.print(steps)
    }

    remove(evt) {
        const steps = this.steps;
        steps.splice(evt.detail.id, 1);
        this.print(steps);
    }

    move({ detail: { id, dropAt, tec } }) {
        if(dropAt < -1) return;
        const steps = this.steps;

        const element = (tec) ? {type: 'start', tec, produce: this.cache.produce } : steps.splice(id, 1)[0];
        const removedOffset = (id <= dropAt) ? 0 : 1;

        steps.splice(dropAt + removedOffset, 0, element);

        this.print(steps);
    }

    duplicate({ detail: {id} }) {
        this.steps.splice(id, 0, {...this.steps[id]});
        this.print(this.steps)
    }

    loadStoredPaths() {
        this.savedPaths;

        return this.database.getAll('Paths')
                   .then((paths) => this.savedPaths = paths.map(({ name }) => name))
                   .catch(this.handle);
    }

    loadStoredAccounts() {
        this.savedAccounts = ['Default']
        return this.database.getAll('AccountData')
                   .then((data) => this.savedAccounts = [...new Set([...data.map(({ player }) => player), 'Default'])])
                   .catch(this.handle);
    }
    
    loadStoredPlanets(player) {
        this.database.get('NewPlanets', player)
            .then((data) => this.newPlanets = data )
            .catch(this.handle);
    }


    // Infra event handler

    handleResourceRequest = ({ resources: resourceChanges, construction }) => {
        if (this.produceResForNextBuild) {
            this.logger.printError({ message: 'Warte auf Ressourcen für ' + construction.type + ' ' + (construction.level+1) })
        }
        else {
            this.account.publish(new InfraEvent(E.RESOURCE_CHANGE, {resourceChanges}, this.cache.coords));

            const res = resourceChanges.values.map(({ amount }) => Math.ceil(amount));

            for (let i = 0; i < 4; i++) {
                this.requested[i] += res[i];
            }
        }
    }


    // Event handler

    selectPath({ detail: name }) {
        this.selectedPath = name;
    }

    selectAccount({ detail: player }) {
        this.reload(player);
    }

    savePath(evt) {
        const name = this.template.querySelector('.path-name').value;
        const proxyFree = JSON.parse(JSON.stringify(this.steps));

        return this.database.upsert('Paths', { name, steps: proxyFree })
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

    changePlanet({ detail : coords }) {
        this.selectPlanet(coords);
    }

    nextPlanet(evt) {
        const planets = this.planets;
        let next = planets.indexOf(this.cache.coords) + 1;
        
        if(next >= planets.length) {
            next = 0;
        }

        this.selectPlanet(planets[next]);
        this.template.querySelector('base-select.planets').selectedIndex = next;
    }

    previousPlanet(evt) {
        const planets = this.planets;
        let prev = planets.indexOf(this.cache.coords) - 1;
        
        if(prev < 0) {
            prev = planets.length-1;
        }
        
        this.selectPlanet(planets[prev]);
        this.template.querySelector('base-select.planets').selectedIndex = prev;
    }

    selectPlanet(coords) {
        this.savePath()
            .then(() => this.loadPlanet(coords))
    }

    loadPlanet(coords) {
        this.cache.coords = (this.planets.includes(coords)) ? coords : this.planets[0];

        this.resetHistory();
        this.resetSelectedPath();
        this.loadPath();
    }

    resetSelectedPath() {
        this.selectedPath = this.accountState.uni + ' ' + this.cache.selectedAccount + ' ' + this.cache.coords;
    }

    reset(evt) {
        this.print([]);
    }

    rerender(evt) {
        this.steps.forEach((step) => {
            if(step.type === 'start') {
                step.produce = this.cache.produce;
            }
        });

        this.print(this.steps);
    }

    undo(evt) {
        if(this.undoDisabled) {
            this.error('Ende der Path history');
            return;
        }
        this.timeTraveling = true;
        this.print([...this.changeHistory[--this.pointer]]);
    }

    redo(evt) {
        if(this.redoDisabled) {
            this.error('Keine weiteren Pfade');
            return;
        }
        this.timeTraveling = true;
        this.print([...this.changeHistory[++this.pointer]]);
        this.toast('Path geladen (Redo)', '[Ctrl + Y]');
    }

    toggleProduce(evt) {
        this.cache.produce = !this.cache.produce;
    }

    toggleDetails(evt) {
        this.cache.hideDetails = !this.cache.hideDetails;
    }

    toggleInlineDetails(evt) {
        this.cache.inlineDetails = !this.cache.inlineDetails;
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

    get changeHistory() {
        const coords = this.cache.coords;
        if(!this.history[coords]) {
            this.history[coords] = [];
        }

        return this.history[coords];
    }

    get resources() {
        return this.account?.planet.resources.printable ?? [];
    }

    get generated() {
        return this.requested.map((res) => res.toLocaleString('de-DE')).join(' | ');
    }

    get planets() {
        const result = [];
        
        result.push(...this.accountState?.planets ?? []);
        result.push(...this.newPlanets?.planets ?? []);
        
        return result.map(({coords}) => coords);
    }

    get logger() {
        return this.template.querySelector('gw-path-logger');
    }

    get showDetails() {
        return !this.cache.hideDetails;
    }
    
    get undoDisabled() {
        return this.pointer < 1;
    }

    get redoDisabled() {
        return this.pointer === this.changeHistory.length-1;
    }
    
    get passedTimeClass() {
        return 'slds-align_absolute-center' + (this.pathHasErrors ? ' error' : '');
    }

    handle = (error) => {
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
