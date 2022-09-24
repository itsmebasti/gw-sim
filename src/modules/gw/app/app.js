import { LightningElement } from 'lwc';
import { CacheMixin } from '../../../classes/framwork/cache/cache';

export default class App extends CacheMixin(LightningElement) {

    cache = this.cached({
        darkmode: true
    });

    connectedCallback() {
        this.cache.darkmode && this.setAttribute('dark-mode', 'dark-mode');
    }

    reloadData({detail: player}) {
        this.template.querySelector('gw-pathfinder').refresh(player);
    }

    toggleTheme(evt) {
        if(this.getAttribute('dark-mode')) {
            this.cache.darkmode = false;
            this.removeAttribute('dark-mode');
        }
        else {
            this.cache.darkmode = true;
            this.setAttribute('dark-mode', 'dark-mode');
        }
    }
}
