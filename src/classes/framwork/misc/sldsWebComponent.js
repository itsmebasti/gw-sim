import { LightningElement } from 'lwc';

export default class SldsWebComponent extends LightningElement {
    constructor() {
        super();
        const path = '/assets/styles/salesforce-lightning-design-system.min.css'
        const styles = document.createElement('link');
        styles.href = path;
        styles.rel = 'stylesheet';
        this.template.appendChild(styles);
    }
}