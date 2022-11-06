import { LightningElement, api, track } from 'lwc';
import { toHHMMSS, dateTimeString, toSeconds, compactString } from '../../../classes/framwork/misc/timeConverters';
import { CHANGE, E } from '../../../classes/model/static/types';

export const LOG_LEVEL = {
    detail: 'detail',
    info: 'info',
    warning: 'warning',
    error: 'error',
    inline: 'inline',
    command: 'command',
}


export default class PathLogger extends LightningElement {
    @api reverse = false;
    @api active;
    @api logLevel = LOG_LEVEL.detail;
    
    @track logs = [];
    account
    startTime;
    serverTime;

    idCounter;
    commandCounter;
    
    connectedCallback() {
        document.addEventListener('keydown', (evt) => {
            const componentVisible = (this.template.querySelector('div')?.offsetWidth > 0);
            if(!componentVisible) return;
            
            if(!evt.ctrlKey && this.active !== undefined) {
                switch(evt.key) {
                    case 'ArrowUp': case 'w': case 'W':
                        this.handleMoveKeyInput(evt, +1);
                        break;
                    case 'ArrowDown': case 's': case 'S':
                        this.handleMoveKeyInput(evt, -1);
                        break;
                }
            }
        });
    }

    renderedCallback() {
        if(this.active === undefined) {
            this.template.activeElement?.blur();
        }
        else {
            this.template.querySelector(`li.command[data-command='${this.active}'] div[tabindex='-1']`)?.focus();
        }
    }

    @api
    reset(account) {
        this.account = account;
        this.startTime = account.serverTime;
        this.serverTime = account.serverTime;
        this.logs = [];
        this.idCounter = 0;
        this.commandCounter = -1;
        this.logQueueInfo();
        
        this.account.subscribe(E.CONTINUE, this.notifySummertimeSwitch);
        this.account.subscribe(E.CONTINUE, this.updateServerTime);
        
        const coords = this.account.current;
        this.account.subscribe(E.RESOURCE_REQUEST, this.handleResourceRequest, coords);
        this.account.subscribe(E.RESOURCE_CHANGE, this.handleResourceChange, coords);
        this.account.subscribe(E.STARTED, this.handleTechnologyStart, coords);
        this.account.subscribe(E.FINISHED, this.handleTechnologyFinish, coords);
        this.account.subscribe(E.FAILED, this.handleFailed, coords);

        this.account.subscribe(E.EVENT_CHANGE, this.handleEventUpdate, coords);
        this.account.subscribe(E.FULFILLING_DEPENDENCY, this.notifyAboutDependencies, coords);
        this.account.subscribe(E.FINISH_RESEARCH_CENTER, this.notifyResearchCenterFinished, coords);
        this.account.subscribe(E.REDUCED_H2_PROD, this.notifyH2OEmpty, coords);
    }

    @api
    command(message, settings = []) {
        this.logs.push({
            id: this.idCounter++,
            command: ++this.commandCounter,
            severity: 'command',
            message,
            level: LOG_LEVEL.command,
            settings,
            isCommand: true,
            cssClass: 'command'});
    }

    @api
    printError({message, details = []}) {
        details.forEach((detail) => {
            this.logs.push({
                id: this.idCounter++,
                command: this.commandCounter,
                settings: [],
                message: detail,
                level: LOG_LEVEL.detail,
                isDetail: true,
                cssClass: 'detail'});
        });
        this.log('ERROR', message, 'error', LOG_LEVEL.error);
    }

    @api
    printInfo(message) {
        this.log('INFO ', message, 'info', LOG_LEVEL.info);
    }

    @api
    printWarning(message) {
        this.log('WARN ', message, 'warning', LOG_LEVEL.warning);
    }

    @api
    addWarning() {
        if(!this.latestCommand) return;
        this.latestCommand.severity += ' warning';
    }

    @api
    markAsSucceeded(construction, duration) {
        if(!this.latestCommand) return;
        
        this.latestCommand.severity += ' success';
        
        if(construction) {
            this.latestCommand.start = this.compactTimeString;
            this.latestCommand.duration = toHHMMSS(duration);
        }
    }

    @api
    markAsRejected() {
        if(!this.latestCommand) return;
        
        this.latestCommand.severity += ' rejected';
        delete this.latestCommand.start;
        delete this.latestCommand.duration;
    }

    log(msgType, message, cssClass = '', level) {
        this.logs.push({
            id: this.idCounter++,
            command: this.commandCounter,
            settings: [],
            time: this.serverTimeString,
            level,
            msgType,
            message,
            cssClass});
    }
    
    
    // EVENT LISTENER

    handleMoveKeyInput(evt, step) {
        const id = this.commandId({target: this.template.activeElement});
        
        if(!isNaN(id)) {
            evt.preventDefault();
            evt.stopPropagation();
            this.moveCommandOneStep(id, step);
        }
    }
    
    bubbleCommandClick(evt) {
        this.dispatchEvent(new CustomEvent('commandclick', { detail: this.commandId(evt) }));
    }

    handleSettingClick(evt) {
        const id = this.commandId(evt)
        this.dispatchEvent(new CustomEvent('settingclick', { detail: { id, action: evt.target.dataset.action } }));
    }

    remove(evt) {
        const id = this.commandId(evt);
        this.dispatchEvent(new CustomEvent('remove', { detail: {id} }));
    }

    startFrom(evt) {
        const id = this.commandId(evt);
        this.dispatchEvent(new CustomEvent('startfrom', { detail: {id} }));
    }

    jumpTo(evt) {
        const id = this.commandId(evt);
        this.dispatchEvent(new CustomEvent('jumpto', { detail: {id} }));
    }

    duplicate(evt) {
        const id = this.commandId(evt);
        this.dispatchEvent(new CustomEvent('duplicate', { detail: {id} }));
    }

    up(evt) {
        this.moveCommandOneStep(this.commandId(evt), +1);
    }

    down(evt) {
        this.moveCommandOneStep(this.commandId(evt), -1);
    }
    
    moveCommandOneStep(commandIndex, step) {
        if(this.reverse) {
            step *= -1;
        }
        
        let newIndex = commandIndex + step;
        
        if(newIndex >= 0 && newIndex <= this.commandCounter) {
            this.dispatchEvent(new CustomEvent('move', { detail: { commandIndex, newIndex } }));
        }
    }

    toEnd(evt) {
        const commandIndex = this.commandId(evt);
        const newIndex = (this.reverse) ? this.commandCounter : 0;
        
        this.dispatchEvent(new CustomEvent('move', { detail: { commandIndex, newIndex } }));
    }

    toStart(evt) {
        const commandIndex = this.commandId(evt);
        const newIndex = (this.reverse) ? 0 : this.commandCounter;
        
        this.dispatchEvent(new CustomEvent('move', { detail: { commandIndex, newIndex } }));
    }

    commandId(evt) {
        return +evt.target.closest('li').dataset.command;
    }
    
    logQueueInfo() {
        const {kz, fz, sf, ob} = this.account.planet;
        const queue = [...kz.queue, ...fz.queue, ...sf.queue, ...ob.queue];
        
        queue.forEach(({type, level}) => this.log('INFO ', `${type} ${level+1} in der Schleife!`, 'info', LOG_LEVEL.info));
    }

    updateServerTime = ({total}) => {
        this.serverTime = this.startTime + total*1000;
    }

    handleEventUpdate = ({filter : {construction : {type, level}}, timeLeft, previous}) => {
        const changedCommand = this.logs.find(({message}) => message === `Starte ${type} ${level+1}`);
        const diff = previous - timeLeft;
        changedCommand && (changedCommand.duration = toHHMMSS(toSeconds(changedCommand.duration) - diff) + '*');
        
        this.log('UPDTE', `${type} (${toHHMMSS(previous)}) => (${toHHMMSS(timeLeft)})`, 'info', LOG_LEVEL.info);
    }
    
    notifyH2OEmpty = () => this.printWarning('Das Wasser ist auf 0, h2 Produktion eingeschränkt!');
    settingclick
    notifySummertimeSwitch = ({duration}) => {
        const before = new Date(this.serverTime).getTimezoneOffset();
        const after = new Date(this.serverTime + duration*1000).getTimezoneOffset();
        
        if(before !== after) {
            const toSummer = (before > after);
            this.printInfo(`Zeitumstellung von 0${toSummer ? 2 : 3}:00 auf 0${toSummer ? 3 : 2}:00`);
        }
    }
    
    notifyAboutDependencies = ({construction: {type, level}}) => {
        this.printInfo(type + ' ' + (level+1) + ' wird erst fertiggestellt um Bedingung zu erfüllen!');
    }
    
    notifyResearchCenterFinished = ({before, after}) => {
        this.printInfo('Forschungszentrum wird erst fertiggestellt! ' + toHHMMSS(before-after) + ' schneller!');
    }

    handleTechnologyStart = ({construction, duration}) => {
        this.markAsSucceeded(construction, duration);
        this.log('START', `${construction.type} ${construction.level+1} (${toHHMMSS(duration)})`, 'construction', LOG_LEVEL.detail);
    }

    handleTechnologyFinish = ({construction: {type, level}}, coords) => {
        this.log('ENDE ', `${type} ${level}`, 'construction', LOG_LEVEL.detail);
    }

    handleResourceRequest = ({resources}) => {
        // temporary Bierbaron fix
        if(this.latestCommand) {
            this.addWarning();
            this.latestCommand.needed = resources.toString();
        }
        else {
            console.log(this.logs)
        }
        
        this.log('RESS ', resources.type.description + ': ' + resources.toString(), 'res', LOG_LEVEL.detail);
    }

    handleResourceChange = ({resourceChanges}) => {
        const now = this.account.planet.resources.state.map(({stored}) => stored | 0);
        const changes = resourceChanges.toArray();
        const before = now.map((stored, i) => stored - +changes[i]);
        
        const logLevel = ([CHANGE.COST, CHANGE.GENERATED, CHANGE.MANUALLY].includes(resourceChanges.type)) ? LOG_LEVEL.detail : LOG_LEVEL.info;
        
        this.log('RESS ', resourceChanges.type.description + ': ' + before.join('|') + ' => ' + resourceChanges.toString(), 'res', logLevel);
    }

    handleFailed = ({error}) => {
        this.markAsRejected();
        this.printError(error);
    }
    
    drag(evt) {
        const liElement = evt.currentTarget.closest('li');
        evt.dataTransfer.setData('command', liElement.dataset.command);
        
        const clone = liElement.cloneNode(false);
        clone.innerText = liElement.firstChild.childNodes[0].textContent;
        this.template.querySelector('ol.drag-image').appendChild(clone);
        
        evt.dataTransfer.setDragImage(clone, evt.offsetX, evt.offsetY);

        evt.currentTarget.classList.add('dragged');
    }

    dragEnd(evt) {
        evt.currentTarget.classList.remove('dragged');
        this.template.querySelector('ol.drag-image').innerHTML = "";
    }

    drop(evt) {
        evt.preventDefault();
        evt.stopPropagation();
        const tec = evt.dataTransfer.getData('tec');
        const commandIndex = +evt.dataTransfer.getData('command');
        let newIndex = +evt.target.closest('[data-command]').dataset.command;
        
        if(tec || newIndex < commandIndex) {
            newIndex++;
        }
        
        this.dispatchEvent(new CustomEvent('move', { detail:{ commandIndex, newIndex, tec } }));
    }

    allowDrop(evt) {
        evt.preventDefault();
    }
    
    priority(logLevel) {
        return [LOG_LEVEL.detail, LOG_LEVEL.info, LOG_LEVEL.warning, LOG_LEVEL.error, LOG_LEVEL.inline, LOG_LEVEL.command]
                    .indexOf(logLevel);
    }
    
    
    // GETTERS
    
    get latestCommand() {
        if(!this.logs?.findLast) {
            console.log(this.logs);
            return;
        }
        return this.logs.findLast(({isCommand}) => isCommand);
    }
    
    get displayedLogs() {
        return this.logs.filter((log) => this.priority(log.level) >= this.priority(this.logLevel)).reverse();
    }
    
    get showInlineDetails() {
        return (this.priority(this.logLevel) <= this.priority(LOG_LEVEL.inline));
    }
    
    get firstOrLastCommand() {
        return (this.reverse) ? this.commandCounter : -1;
    }
    
    get direction() {
        return (this.reverse) ? 'reverse' : '';
    }
    
    get startTimeString() {
        return dateTimeString(this.startTime);
    }

    get serverTimeString() {
        return dateTimeString(this.serverTime);
    }

    get compactTimeString() {
        return compactString(this.serverTime);
    }
}