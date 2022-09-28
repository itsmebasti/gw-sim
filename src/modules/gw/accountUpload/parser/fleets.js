import Fleet from '../../../../classes/model/fleet/fleet';
import Database from '../../../../classes/framwork/database/database';
import ServerInfo from './serverInfo';

export default class Fleets {
    values;
    database = new Database();
    serverSeconds;

    constructor(raw) {
        const serverInfo = new ServerInfo(raw);
        this.serverSeconds = serverInfo.serverTime/1000;
        
        raw = raw.replaceAll(/'<img[^>]+>/g, '');
        raw = raw.replaceAll(/https:\/\/[^ "]+/g, '');

        const events = document.createElement('p');
        events.innerHTML = [...raw.matchAll(/<table.*?<\/table>/gs)].pop();

        const own = [...events.querySelectorAll(".itemOwnFleet")];
        const back = [...events.querySelectorAll(".itemComebackFleet")];
        const other = [...events.querySelectorAll(".itemOtherFleet")];

        const startedFleets = own.map(this.missionDetails);

        this.values = back.map((returnRow) => {
            const returningMissionDetails = this.missionDetails(returnRow);
            const currentMissionDetails = startedFleets.find((started) => started.id === returningMissionDetails.id) ?? returningMissionDetails;

            return new Fleet(serverInfo, returnRow, currentMissionDetails, returningMissionDetails.arrival);
        });

        this.values.push(...other.map((row) => new Fleet(serverInfo, row, this.missionDetails(row))));
    }

    store() {
        this.database.add("Fleets", ...this.values)
            // .then(() => this.database.deleteAllBy("Fleets", "deployTime", IDBKeyRange.upperBound(this.serverSeconds)))
            // .then(() => this.database.deleteAllBy("Fleets", "resTime", IDBKeyRange.upperBound(this.serverSeconds)))
    }

    missionDetails = (row) => {
        return {
            id: row.querySelector("i[data-id]").dataset.id,
            arrival: row.querySelector("td.countTime").dataset.time,
            mission: row.querySelector("td:nth-of-type(3) span").textContent.trim(),
        };
    }
}