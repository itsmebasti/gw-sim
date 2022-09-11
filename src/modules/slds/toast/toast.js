import { LightningElement, api, track } from 'lwc';

export default class Toast extends LightningElement {
    id = 0;
    @track toasts = [];

    @api display(severity, message, details) {
        this.toasts.push({
            id: this.id++,
            severity,
            message,
            details,
            css: 'slds-notify slds-notify_toast slds-theme_' + severity,
            iconCss: 'slds-icon_container slds-m-right_small slds-no-flex slds-align-top slds-icon-utility-' + severity,
            href: '/assets/icons/utility-sprite/svg/symbols.svg#' + severity
        });

        this.show = setTimeout(() => this.toasts.shift(), 2000);
    }
}