import { LightningElement } from 'lwc';
import Database from '../../../classes/framwork/database/database';
import UNI from '../../../classes/model/infra/uni';
import Fleets from '../accountUpload/parser/fleets';
import ServerInfo from '../accountUpload/parser/serverInfo';

export default class AccountUpload extends LightningElement {
    database = new Database();

    uni = UNI.list[0];
    
    setUni({ detail : name }) {
        this.uni = name;
    }
    
    selectInput(evt) {
        this.template.querySelector('input').focus();
    }
    
    pasteDom(evt) {
        evt.preventDefault();
        evt.target.value = evt.clipboardData.getData('text/html');
        
        this.template.querySelector('lightning-button').focus();
    }

    upload(evt) {
        try {
            const landingDom = this.template.querySelector('input').value;
            
            new Fleets(landingDom).store()
                    .then(() => {
                        const player = new ServerInfo(landingDom).player;
                        
                        this.toast(player + ' Flotten erfolgreich hochgeladen');
                        this.dispatchEvent(new CustomEvent('accountchange', { detail: player, bubbles: true, composed: true }));
                        
                        this.template.querySelector('input').value = "";
                    })
                    .catch(this.handle);
        }
        catch(e) {
            this.toast('Daten fehlerhaft!', e.message ?? e, 'error');
            console.error(e);
        }
    }

    // Getters

    get unis() {
        return UNI.list;
    }

    get landing() {
        return `https://${this.uni}.gigrawars.de/game_dashboard_index/`;
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