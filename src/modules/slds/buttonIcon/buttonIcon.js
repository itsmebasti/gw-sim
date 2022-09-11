import { LightningElement, api } from 'lwc';

export default class buttonIcon extends LightningElement {
    @api namespace = 'utility';
    @api size = 'small';
    @api text;
    @api icon;
    @api variant = 'brand';
    @api disabled = false;

    get href() {
        return '/assets/icons/' + this.namespace + '-sprite/svg/symbols.svg#' + this.icon;
    }

    get buttonClass() {
        return 'slds-button slds-button_icon slds-button_icon-' + this.variant + ' slds-button_icon-' + this.size;
    }
}