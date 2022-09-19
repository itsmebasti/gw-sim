import { LightningElement } from 'lwc';
import Database from '../../../classes/framwork/database/database';

export default class Fleets extends LightningElement {
    database = new Database();
    fleets = [];
    filters = {};

    subsets = [
        { value: "all", label: " - none - " },
        { value: "tradeIn", label: "Handel In" },
        { value: "tradeOut", label: "Handel Out" },
        { value: "deploy", label: "Stationieren" },
        { value: "transport", label: "Transport" },
        { value: "save", label: "Saveflüge" },
        { value: "deleted", label: "Gelöscht" },
        { value: "active", label: "Aktive" },
        { value: "farm", label: "Farmflüge" },
        { value: "atts", label: "Feindliche Angriffe"}
    ];

    constructor() {
        super();

        this.refreshFleet();
    }


    refreshFleet() {
        this.database.getAll("Fleets")
            .then((fleets) => this.fleets = fleets);
    }


    get filteredData() {
        if(Object.keys(this.filters).length > 0) {
            return this.fleets.filter((fleet) => this.matches(fleet, this.filters));
        }
        return [];
    }


    get filteredDataJson() {
        return JSON.stringify(this.filteredData, undefined, 2);
    }


    get filtersJson() {
        return JSON.stringify(this.filters, undefined, 2);
    }


    selectSubset({ target : {value : methodName } }) {
        this[methodName]();
    }


    add(filters) {
        this.filters = Object.assign(this.filters, filters);
    }


    matches(any, filter) {
        if(typeof filter === "object") {
            return Object.entries(filter).every(([key, value]) => this.matches(any[key], value));
        }

        return (any === filter);
    }

    // SUBSETS

    all() {
        this.filters = {};
    }


    selectDataset(evt) {
        if(evt.target.value === "own") {
            this.add({ ownFleet: true });
        }
        else if(evt.target.value === "other") {
            this.add({ ownFleet: false });
        }
    }

    atts() {
        this.filters = { ownFleet: false, mission: "Angriff" };
    }

    tradeIn() {
        this.filters = { ownFleet: false, mission: "Transport", havingRes: true };
    }

    tradeOut() {
        this.filters = { ownFleet: true, mission: "Transport", havingRes: true,
                   target: { exists: true, isOwnPlanet: false }};
    }

    deleted() {
        this.filters = { ownFleet: true, friendly: false, target: { exists: false }};
    }

    farm() {
        this.filters = { ownFleet: true, arrival: undefined, friendly: false };
    }

    active() {
        this.filters = { ownFleet: true, arrival: undefined, friendly: false, havingRes: false, target: { exists: true }};
    }

    save() {
        this.filters = { ownFleet: true, friendly: true, target: { exists: false }};
    }

    transport() {
        this.filters = { ownFleet: true, mission: "Transport", target: { isOwnPlanet: true } };
    }

    deploy() {
        this.filters = { ownFleet: true, mission: "Stationierung", target: { isOwnPlanet: true } };
    }

    switchTabs({target}) {
        const shown = this.template.querySelector('div.slds-tabs_default__content.slds-show');
        const hidden = this.template.querySelector('div.slds-tabs_default__content.slds-hide');


        shown.classList.add("slds-hide");
        shown.classList.remove("slds-show");

        hidden.classList.add("slds-show");
        hidden.classList.remove("slds-hide");

        [...this.template.querySelectorAll(".slds-tabs_default__item")].forEach((tab) => {
            tab.classList.remove("slds-is-active");
        })
        target.parentNode.classList.add("slds-is-active");
    }
}
