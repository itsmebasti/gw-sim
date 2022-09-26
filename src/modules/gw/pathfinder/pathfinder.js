import { LightningElement, api, track } from 'lwc';
import { CacheMixin } from 'lwc-base';
import { toHHMMSS } from '../../../classes/framwork/misc/timeConverters';

import technologies from '../../../classes/model/static/technologies';
import UNI, { accountState } from '../../../classes/model/infra/uni';
import Account from '../../../classes/model/infra/account'
import Database from '../../../classes/framwork/database/database';
import InfraEvent from '../../../classes/framwork/events/infraEvent';
import { E } from '../../../classes/model/static/types';
import { ResourceError } from '../../../classes/model/resources/resourceStorage';

export default class Pathfinder extends CacheMixin(LightningElement) {
    database = new Database();

    @track savedAccounts;
    @track savedPaths;
    @track accountState;
    selectedPath;
    account;

    steps = [];
    history = {};
    pointer = -1;
    timeTraveling = false;

    @track requested = [0, 0, 0, 0];
    timePassed = '00:00:00';
    produceResForNextBuild = true;

    @track cache = this.cached({
        selectedAccount: 'Default',
        coords: '1:1:1',
        produce: true,
        hideDetails: false,
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
        });

        this.refresh();
    }

    @api refresh(accountName = this.cache.selectedAccount ?? 'Default') {
        this.loadStoredPaths();
        this.loadStoredAccounts();

        this.database.get('AccountData', accountName)
            .then((state) => this.load(state ?? accountState(UNI.default.NAME)))
            .catch(() => this.load(accountState(UNI.default.NAME)));
    }

    load(accountState) {
        this.accountState = accountState;
        this.cache.selectedAccount = accountState.player;

        this.loadPlanet(this.cache.coords);
    }

    print(steps) {
        try {
            this.account = new Account(this.accountState);
        }
        catch(e) {
            this.handle(e);
            this.load(accountState('speed3'));
            return;
        }

        this.account.current = this.cache.coords;
        this.account.subscribe(E.RESOURCE_REQUEST, this.handleResourceRequest, this.cache.coords);

        this.requested = [0, 0, 0, 0];
        this.steps = [];
        this.steps = steps;
        this.updateHistory();

        this.logger.reset(this.account);
        steps.forEach(this.execute);

        if(steps.length === 0) {
            this.updateJsonOutput();
            this.timePassed = toHHMMSS(this.account.passed);
        }
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

    complete(evt) {
        this.add({ type: 'complete' });
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
                    this.logger.command('Starte ' + step.tec + ' ' + this.levelFor(step.tec));
                    this.produceResForNextBuild = step.produce ?? true;
                    this.account.completeAndEnqueue(step.tec);
                    this.produceResForNextBuild = true;
                    break;
                case 'wait':
                    this.logger.command('Warten ' + toHHMMSS(step.seconds));
                    this.account.continue(step.seconds);
                    break;
                case 'complete':
                    this.logger.command('Fertig Bauen');
                    this.account.completeAllOn(this.cache.coords);
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
            this.logger.printError(error);
        }

        this.timePassed = toHHMMSS(this.account.passed);
        this.updateJsonOutput();
    }

    levelFor(tech) {
        const construction = this.account.get(tech);
        return 1 + construction.level + this.account.get(construction.factoryType).queue.filter(({type}) => type === tech).length;
    }


    // Step re-ordering

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

    move({ detail: {from, to} }) {
        if(to < -1) return;
        const steps = this.steps;

        const element = steps.splice(from, 1)[0];
        const deletedOffset = (from <= to) ? 0 : 1;

        steps.splice(to + deletedOffset, 0, element);
        this.print(steps)
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
        this.refresh(player);
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
        const next = planets.indexOf(this.cache.coords) + 1;

        if(next >= 0 && next < planets.length) {
            this.selectPlanet(planets[next]);
            this.template.querySelector('base-select.planets').selectedIndex = next;
        }
    }

    previousPlanet(evt) {
        const planets = this.planets;
        const prev = planets.indexOf(this.cache.coords) - 1;

        if(prev >= 0) {
            this.selectPlanet(planets[prev]);
            this.template.querySelector('base-select.planets').selectedIndex = prev;
        }
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

    toggleDetails() {
        this.cache.hideDetails = !this.cache.hideDetails;
    }

    updateJsonOutput() {
        this.template.querySelector('.path').value = (this.steps.length) ? JSON.stringify(this.steps) : '';
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

    get constructions() {
        return [
            {label: 'Gebäude', options: technologies.buildings },
            {label: 'Forschung', options: technologies.research },
            {label: 'Schiffe', options: technologies.ships },
            {label: 'Türme', options: technologies.towers },
        ]
    }

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
        return this.requested.map((res) => res.toLocaleString('de-DE')).join('|');
    }

    get planets() {
        return this.accountState?.planets.map(({coords}) => coords) ?? [];
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
