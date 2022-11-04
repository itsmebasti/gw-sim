import { LightningElement, track, api } from 'lwc';
import Database from '../../../classes/framwork/database/database';

const DEFAULT_PLANET = {coords: '50:100:1', startTime: Date.now()};

export default class AddPlanet extends LightningElement {
    database = new Database();
    stored;
    
    _player;
    @track planet = DEFAULT_PLANET;
    
    @api set player(value) {
        this._player = value;
        this.reload();
    }
    
    get player() {
        return this._player;
    }
    
    @api reload() {
        this.loadStoredPlanets();
    }
    
    loadStoredPlanets() {
        this.database.get('NewPlanets', this.player)
            .then((data) => {
                if(data?.planets.length) {
                    this.stored = data;
                    if(!this.newCoords.includes(this.planet.coords)) {
                        this.selectPlanet({detail: this.stored.planets[0].coords});
                    }
                }
                else {
                    this.stored = { player: this.player, planets: [] };
                }
            })
            .catch(this.handle);
    }

    store(evt) {
        const coords = this.parsedCoords();
        
        if(!this.newCoords.includes(coords)) {
            this.stored.planets.push({coords});
        }
        
        const planet = this.stored.planets.find(({coords: c}) => c === coords);
        planet.startTime = this.template.querySelector('base-date-time').value;
        
        this.database.add('NewPlanets', this.stored)
            .then(() => {
                this.toast('Planet ' + planet.coords + ' erfolgreich hinzugefügt');
                this.planet = planet;
                
                this.dispatchEvent(new CustomEvent('accountchange', { detail: this.player, bubbles: true, composed: true }));
                this.loadStoredPlanets();
            })
            .catch(this.handle);
    }
    
    remove(evt) {
        const coords = this.parsedCoords();
        this.stored.planets = this.stored.planets.filter(({coords: c}) => c !== coords);
        
        this.database.add('NewPlanets', {...this.stored})
            .then(() => {
                this.toast('Planet ' + this.planet.coords + ' erfolgreich gelöscht');
                
                this.dispatchEvent(new CustomEvent('accountchange', { detail: this.player, bubbles: true, composed: true }));
                this.loadStoredPlanets();
            })
            .catch(this.handle);
    }
    
    parsedCoords() {
        return this.template.querySelector('input.coords').value;
    }

    selectPlanet({ detail }) {
        this.planet = this.stored.planets.find(({coords}) => coords === detail) ?? DEFAULT_PLANET;
    }
    
    get newCoords() {
        return this.stored?.planets.map(({coords}) => coords) ?? [];
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