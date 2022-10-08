import { LightningElement, api, track } from 'lwc';
import { toHHMMSS, dateTimeString, toSeconds, compactString } from '../../../classes/framwork/misc/timeConverters';
import { E } from '../../../classes/model/static/types';

const DIRECTION = { UP: Symbol(), DOWN: Symbol() };

export default class PathLogger extends LightningElement {
    @api hideDetails = false;
    @api inlineDetails = false;
    @track logs = [];
    @api reverse;
    account
    startTime;
    serverTime;

    idCounter;
    commandCounter;
    lastKeyMove;

    connectedCallback() {
        document.addEventListener('keydown', (evt) => {
            if (!evt.ctrlKey) {
                switch(evt.key) {
                    case 'ArrowUp': case 'w': case 'W':
                        this.move(evt, DIRECTION.UP);
                        break;
                    case 'ArrowDown': case 's': case 'S':
                        this.move(evt, DIRECTION.DOWN);
                        break;
                }
            }
        });
    }

    renderedCallback() {
        if(this.lastKeyMove !== undefined) {
            this.template.querySelector(`li.command[data-command='${this.lastKeyMove}'] div`)?.focus();
            this.lastKeyMove = undefined;
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
        this.startListening(account);
    }

    @api
    command(message, settings = []) {
        this.logs.push({
            id: this.idCounter++,
            command: ++this.commandCounter,
            severity: 'command',
            message,
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
                isDetail: true,
                cssClass: 'detail'});
        });
        this.log('ERROR', message, 'error');
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
    
    get latestCommand() {
        if(!this.logs?.findLast) {
            console.log(this.logs);
            return;
        }
        return this.logs.findLast(({isCommand}) => isCommand);
    }

    log(msgType, message, cssClass = '') {
        this.logs.push({
            id: this.idCounter++,
            command: this.commandCounter,
            settings: [],
            time: this.serverTimeString,
            msgType,
            message,
            cssClass});
    }

    get displayedLogs() {
        return this.logs.filter((log) => !this.hideDetails || log.isCommand).reverse();
    }

    clear() {
        this.logs = [];
    }

    move(evt, direction) {
        const liElement = this.template.activeElement?.parentElement;
        const command = +liElement?.dataset.command;
        const earlier = (direction === (this.reverse ? DIRECTION.UP : DIRECTION.DOWN));

        if(!isNaN(command)) {
            evt.preventDefault();
            evt.stopPropagation();
            this.dispatchEvent(new CustomEvent('move', { detail:{ id: command, dropAt: command + ((earlier) ? -2 : 1) } }));
            this.lastKeyMove = (earlier) ? command-1 : command+1;
        }
    }

    handleSettingClick(evt) {
        this.dispatchEvent(new CustomEvent('settingclick', { detail: { action: evt.target.dataset.action, id: this.commandId(evt) } }));
    }

    remove(evt) {
        this.dispatchEvent(new CustomEvent('remove', { detail: { id: this.commandId(evt) } }));
    }

    jumpTo(evt) {
        this.dispatchEvent(new CustomEvent('jumpto', { detail: { id: this.commandId(evt) } }));
    }

    duplicate(evt) {
        this.dispatchEvent(new CustomEvent('duplicate', { detail: { id: this.commandId(evt) } }));
    }

    up(evt) {
        const id = this.commandId(evt);
        this.dispatchEvent(new CustomEvent('move', { detail: { id, dropAt: id+1 } }));
    }

    down(evt) {
        const id = this.commandId(evt);
        this.dispatchEvent(new CustomEvent('move', { detail: { id, dropAt: id-2 } }));
    }

    toEnd(evt) {
        const id = this.commandId(evt);
        this.dispatchEvent(new CustomEvent('move', { detail: { id, dropAt: -1 } }));
    }

    commandId(evt) {
        return parseInt(evt.target.closest('li').dataset.command);
    }

    startListening(account) {
        account.subscribe(E.RESOURCE_REQUEST, this.handleResourceRequest, account.current);
        account.subscribe(E.RESOURCE_CHANGE, this.handleResourceChange, account.current);
        account.subscribe(E.STARTED, this.handleTechnologyStart, account.current);
        account.subscribe(E.FINISHED, this.handleTechnologyFinish, account.current);
        account.subscribe(E.FAILED, this.handleFailed, account.current);
        account.subscribe(E.WAITING, this.updateServerTime);

        account.subscribe(E.EVENT_CHANGE, this.handleEventUpdate, account.current)
    }

    updateServerTime = ({total}) => {
        this.serverTime = this.startTime + total*1000;
    }

    handleEventUpdate = ({filter : {construction : {type, level}}, timeLeft, previous}) => {
        const changedCommand = this.logs.find(({message}) => message === `Starte ${type} ${level+1}`);
        const diff = previous - timeLeft;
        changedCommand && (changedCommand.duration = toHHMMSS(toSeconds(changedCommand.duration) - diff) + '*');
        
        this.log('UPDATE', `${type} (${toHHMMSS(previous)}) => (${toHHMMSS(timeLeft)})`, 'construction');
    }

    handleTechnologyStart = ({construction, duration}) => {
        this.markAsSucceeded(construction, duration);
        this.log('START', `${construction.type} ${construction.level+1} (${toHHMMSS(duration)})`, 'construction');
    }

    handleTechnologyFinish = ({construction: {type, level}}, coords) => {
        this.log('DONE ', `${coords} ${type} ${level}`, 'construction');
    }

    handleResourceRequest = ({resources}) => {
        this.addWarning();
        
        this.latestCommand.needed = resources.toString();
        
        this.log('NEED ', 'Benötigt: ' + resources.toString(), 'res');
    }

    handleResourceChange = ({resourceChanges}) => {
        const now = this.account.planet.resources.state.map(({stored}) => stored | 0);
        const changes = resourceChanges.toArray();
        const before = now.map((stored, i) => stored - +changes[i]);

        const changesString = changes.map((value) => (value > 0) ? '+'+value : value).join('|');

        this.log('RESS ', before.join('|') + ' => ' + changesString, 'res');
    }

    handleFailed = ({error}) => {
        this.markAsRejected();
        this.printError(error);
    }
    
    drag(evt) {
        const li = evt.currentTarget;
        evt.dataTransfer.setData('command', li.dataset.command);
        const dragImage = this.template.querySelector('ol.temp').appendChild(li.cloneNode(true));
        dragImage.classList.add('drag-image');
        evt.dataTransfer.setDragImage(dragImage, evt.offsetX, evt.offsetY);

        li.classList.add('dragged');
    }

    dragEnd(evt) {
        evt.currentTarget.classList.remove('dragged');
        this.template.querySelector('.drag-image').remove();
    }

    drop(evt) {
        evt.preventDefault();
        evt.stopPropagation();
        const id = parseInt(evt.dataTransfer.getData('command') ?? this.commandCounter);
        const dropAt = parseInt(evt.currentTarget.dataset.command ?? -1);
        const tec = evt.dataTransfer.getData('tec');
        this.dispatchEvent(new CustomEvent('move', { detail:{ id, dropAt, tec } }));
    }

    allowDrop(evt) {
        evt.preventDefault();
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