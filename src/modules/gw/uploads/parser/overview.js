import technologiesByType from '../../../../classes/model/static/technologies';
import { RES, NAMES, FACTORY } from '../../../../classes/model/static/types';

export default class Overview {
    allCoords;
    rowByType = {};
    planets;

    constructor(rawHtml, tempElement) {
        const table = document.createElement('p');
        table.innerHTML = [...rawHtml.matchAll(/<table.*?<\/table>/gs)][0];
        tempElement.appendChild(table);

        this.allCoords = [...table.querySelectorAll('tr:nth-child(2) :nth-child(n+2):nth-last-child(n+3)')]
                            .map((match) => match.innerHTML);

        table.querySelectorAll('tr').forEach((trElement, index) => {
            const row = this.row(trElement, index);
            if(row.containsData()) {
                this.rowByType[row.type] = row;
            }
        });

        this.planets =this.allCoords.map((coords) => this.planet(coords));

        tempElement.innerHTML = '';
    }


    planet(coords) {
        return {
            coords,
            current: [this.valueFor('Gebäude', coords), this.valueFor('Produktion', coords)].filter(Boolean),
            infra: {
                buildings: this.allValuesFor('buildings', coords),
                ships: this.allValuesFor('ships', coords),
                towers: this.allValuesFor('towers', coords)
            },
            resources: [
                { type: RES.FE, stored: this.valueFor(NAMES[RES.FE], coords) },
                { type: RES.LUT, stored: this.valueFor(NAMES[RES.LUT], coords) },
                { type: RES.H2O, stored: this.valueFor(NAMES[RES.H2O], coords) },
                { type: RES.H2, stored: this.valueFor(NAMES[RES.H2], coords) }
            ],
        };
    }

    row(trElement, index) {
        switch (index) {
            case 2: return new CurrentShipRow(trElement);
            case 3: return new CurrentBuildingRow(trElement);
            default: return new Row(trElement);
        }
    }

    allValuesFor(group, coords) {
        return technologiesByType[group].reduce((result, type) => (result[type] = this.valueFor(type, coords), result), {});
    }

    valueFor(type, coords) {
        return this.rowByType[type].get(this.allCoords.indexOf(coords));
    }
}

class Row {
    trElement;

    constructor(trElement) {
        this.trElement = trElement;
    }

    containsData() {
        return (this.trElement.querySelectorAll('td').length > 0);
    }

    get type() {
        return this.trElement.querySelector('th').innerText;
    }

    get(index) {
        let content = this.trElement.querySelector(`td:nth-of-type(${index+1})`).innerText;
        return parseInt(content.replaceAll('\.', '').replace('-', '0'));
    }


    timeToSeconds(string) {
        const a = string.split(':');
        return (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]);
    }

    toSeconds(string) {
        const prod = /Dauer( (\d+) Tage?,)? (.*)/.exec(string);
        const time = this.timeToSeconds(prod[3]);
        const days = prod[2] || 0;

        return time + days * 24 * 3600;
    }
}

class CurrentShipRow extends Row {
    constructor(trElement) {
        super(trElement);
    }

    get(index) {
        const result = {factory: FACTORY.SF};
        const ship = this.trElement.querySelector('span')?.getAttribute('original-title');

        if(ship) {
            result.type = /aktuell (\d+) (.*) Dauer/.exec(ship)[2];
            result.amount = Number(/aktuell (\d+) (.*) Dauer/.exec(ship)[1]);
            result.timeLeft = this.toSeconds(ship);

            return result;
        }
        else {
            return undefined;
        }
    }
}

class CurrentBuildingRow extends Row {
    constructor(trElement) {
        super(trElement);
    }

    get(index) {
        let result = {factory: FACTORY.KZ};

        const currentBuilding = this.trElement.querySelector(`td:nth-of-type(${index+1})`).innerText;
        if (currentBuilding !== '-') {
            const lines = currentBuilding.split('\n');

            result.type = new RegExp('(.*) Stufe').exec(lines[0])[1];

            const time = new RegExp('\\d+:\\d+:\\d+').exec(lines[1])[0];
            result.timeLeft = this.timeToSeconds(time);

            const days = new RegExp('(\\d+) Tag').exec(lines[1]);
            if (days) {
                result.timeLeft += (days[1] * 24 * 3600);
            }

            return result;
        }
        else {
            return undefined;
        }
    }
}