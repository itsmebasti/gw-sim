import Fleet from '../../../../classes/model/fleet/fleet';
import { gwToMilliseconds } from '../../../../classes/framwork/misc/timeConverters';
import Database from '../../../../classes/framwork/database/database';

export default class Fleets {
    values;
    database = new Database();

    constructor(raw) {
        raw = raw.replaceAll(new RegExp('<img[^>]+src="([^">]+)".*>', 'g'), '');
        raw = raw.replaceAll(/gigrawars\.de/g, '');
        const tables = [...raw.matchAll(/<table.*?<\/table>/gs)];

        const infraTable = document.createElement('p');
        infraTable.innerHTML = tables.pop();

        const own = [...infraTable.querySelectorAll(".itemOwnFleet")];
        const back = [...infraTable.querySelectorAll(".itemComebackFleet")];
        const other = [...infraTable.querySelectorAll(".itemOtherFleet")];

        const startedFleets = own.map(this.missionDetails);

        this.values = back.map((returnRow) => {
            const id = returnRow.querySelector("i").dataset.id;

            const returningMissionDetails = this.missionDetails(returnRow);
            const currentMissionDetails = startedFleets.find((started) => started.id === id) || returningMissionDetails;

            return new Fleet(returnRow, currentMissionDetails, returningMissionDetails.arrival);
        });

        this.values.push(...other.map((row) => new Fleet(row, this.missionDetails(row))));
    }

    store() {
        this.database.add("Fleets", ...this.values)
        // .then(() => this.database.deleteAllBy("Fleets", "deployTime", IDBKeyRange.upperBound(Date.now()) / 1000 | 0))
        // .then(() => this.database.deleteAllBy("Fleets", "resTime", IDBKeyRange.upperBound(Date.now()) / 1000 | 0))
    }

    missionDetails = (row) => {
        const dateString = row.querySelector("td.countTime").getAttribute("original-title");

        return {
            id: row.querySelector("i").dataset.id,
            arrival: gwToMilliseconds(dateString) / 1000 | 0,
            mission: row.querySelector("td:nth-of-type(3) span").textContent.trim(),
        };
    }
}