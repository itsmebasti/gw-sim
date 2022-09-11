import { LightningElement, api } from 'lwc';

export default class TimeSlider extends SldsWebComponent {
    @api hours = 24;
    _seconds;

    _start;
    @api set start(value) {
        this._start = value;
        this.seconds = value;
    }

    @api
    focus() {
        this.template.querySelector("input").focus();
    }

    @api
    set seconds(value) {
        // if(value > this.max) {
        //     this.hours += value/3600;
        // }
        this._seconds = value;
    }

    get seconds() {
        return this._seconds;
    }

    get start() {
        return this._start;
    }

    updateSeconds({ target : {value}}) {
        this.seconds = (+value);
    }

    dispatch() {
        this.dispatchEvent(new CustomEvent("change"));
    }

    get bubbleText() {
        return new Date(this.seconds * 1000).toLocaleString();
    }

    get min() {
        return this.start;
    }

    get max() {
        return this.start + Number(this.hours)*60*60;
    }

    get bubbleStyle() {
        const position = ((Math.min(this.seconds, this.max) - this.min) * 100) / (this.max - this.min);
        return `left: calc(${position}% + (${8 - position * 0.15}px))`;
    }
}