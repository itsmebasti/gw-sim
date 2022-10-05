import { LightningElement } from 'lwc';
import { CacheMixin } from 'lwc-base';

export default class App extends CacheMixin(LightningElement) {
    cache = this.cached({
        darkmode: true,
        reverse: false
    });
    
    reverse = this.cache.reverse;

    connectedCallback() {
        this.cache.darkmode && this.setAttribute('dark-mode', 'dark-mode');
    }

    reloadData({detail: player}) {
        this.template.querySelector('gw-pathfinder').reload(player);
        this.template.querySelector('gw-account-config').reload(player);
    }

    toggleTheme({detail: darkmode}) {
        if(darkmode) {
            this.setAttribute('dark-mode', 'dark-mode');
        }
        else {
            this.removeAttribute('dark-mode');
        }
    }
    
    togglePathDirection({detail: reverse}) {
        this.reverse = reverse;
    }
}
