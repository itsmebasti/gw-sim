import { LightningElement, api } from 'lwc';

export default class Toggle extends LightningElement {
    @api checked = false;

    @api label;
    @api whenOn;
    @api whenOff;

    bubble(evt) {
        this.dispatchEvent(new CustomEvent('change', {detail: !this.checked}))
    }
}