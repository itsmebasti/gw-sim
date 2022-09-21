import { NAMES, RES } from '../static/types';

export default class Fleet {
    constructor(row, { id, mission, arrival }, returning) {
        const missionElement = row.querySelector("td:nth-of-type(3)");
        const { res, ships } = this.fleetDetails(missionElement.querySelector("span").getAttribute("original-title"));
        const  [from, ,to] = row.querySelector("td:nth-of-type(4)").children;
        
        this.id = id;
        this.mission = mission;
        this.arrival = arrival;
        this.returning = returning;
        this.source = this.planet(from);
        this.target = this.planet(to);
        this.res = res;
        this.havingRes = Object.values(this.res).some((value) => value > 0);
        this.empty = Object.values(this.res).every((value) => value === 0);
        this.ships = ships;
        
        this.ownFleet = (returning !== undefined);
        this.friendly = new Set(["rgb(0, 242, 255)", "rgb(0, 255, 0)"]).has(missionElement.style.color);
        this.important = (row.querySelector("i.unsetFleetImportant") !== null);
        this.unimportant = (row.querySelector("i.unsetFleetIgnore") !== null);
        
        this.delivery = (this.empty) ? null :
            (mission === "Rückflug" || !this.target.exists) ?
                { planet: this.source, time: this.returning } :
                { planet: this.target, time: this.arrival };
        this.deploy = (!this.ownFleet) ? null :
            (this.mission === "Stationierung" && this.target.isOwnPlanet) ?
                { planet: this.target, time: this.arrival } :
                { planet: this.source, time: this.returning };
    }
    
    
    get shipsString() {
        return JSON.stringify(this.ships, undefined, 2)
            .replace("{\n", "")
            .replace("\n}", "")
            .replaceAll("\"", "")
            .replaceAll(",", "")
            .replaceAll("  ", "")
            .replaceAll("Großes Handelsschiff", "GH")
            .replaceAll("Longeagle V", "LEV")
            .replaceAll("Longeagle X", "LEX");
    }
    
    
    planet(coords) {
        const isOwnPlanet = coords.classList.contains("switchToCoordinate");
        const player = (isOwnPlanet) ? "Default" : coords.getAttribute("original-title");
        const id = (isOwnPlanet) ? "108" : /id\/(\d+)/.exec(coords.getAttribute("href") || "id/0")[1];
        const exists = (player !== "Unbesiedelt");
        const url = "https://uni3.gigrawars.de/game_player_index/id/" + id + "/"
        
        return { coords: coords.textContent.trim(), isOwnPlanet, player, id, exists, url };
    }
    
    
    fleetDetails(infoString) {
        const result = { res : {fe : 0, lut : 0, h2o : 0, h2 : 0 }, ships : {} };
        
        if(infoString && infoString !== "Keine Rohstoffe.") {
            const temp = document.createElement('p');
            temp.innerHTML = infoString;
    
            let lastCategory = "";
            temp.childNodes.forEach((element) => {
                const content = element.textContent.trim();
                
                if(element.nodeName === "B") {
                    lastCategory = (content === "Rohstoffe") ? "res" : "ships";
                }
                else if(element.nodeName === "#text") {
                    let [,type, amount] = /([A-ü ]*) ([\d.]+)/g.exec(content);
    
                    type = type
                        .replace(NAMES[RES.FE], RES.FE)
                        .replace(NAMES[RES.LUT], RES.LUT)
                        .replace(NAMES[RES.H2O], RES.H2O)
                        .replace(NAMES[RES.H2], RES.H2);
                    
                    result[lastCategory][type] = Number(amount.replaceAll(".", ""));
                }
            });
        }
        
        return result;
    }
}