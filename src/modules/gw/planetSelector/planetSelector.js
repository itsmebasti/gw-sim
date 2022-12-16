import { LightningElement, api } from 'lwc';

export default class PlanetSelector extends LightningElement {
    @api planets = [];
    @api selected;

    switchPlanets(evt) {
        const componentVisible = (evt.target.offsetWidth > 0);
        
        if(componentVisible && !evt.ctrlKey) {
            const hotKeyAction = {
                'ArrowRight': this.next,
                'd': this.next,
                'D': this.next,
                'ArrowLeft': this.previous,
                'a': this.previous,
                'A': this.previous,
            }[evt.key];
            
            if(hotKeyAction) {
                hotKeyAction();
                evt.preventDefault();
            }
        }
    }
    
    changePlanet({ detail : coords }) {
        this.selected = coords;
        this.dispatchEvent(new CustomEvent('select'));
    }

    @api next(evt) {
        let next = this.planets.indexOf(this.selected) + 1;
        
        if(next >= this.planets.length) {
            next = 0;
        }
        
        this.selected = this.planets[next];
        this.dispatchEvent(new CustomEvent('select'));
    }

    @api previous(evt) {
        let prev = this.planets.indexOf(this.selected) - 1;
        
        if(prev < 0) {
            prev = this.planets.length-1;
        }
        
        this.selected = this.planets[prev];
        this.dispatchEvent(new CustomEvent('select'));
    }
}