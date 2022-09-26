import { gwToMilliseconds } from '../../../../classes/framwork/misc/timeConverters';
import { FACTORY } from '../../../../classes/model/static/types';

export default class Landing {
    uni;
    player;
    serverTime;
    research;
    buildings = [];

    constructor(raw) {
        this.uni = raw.match(/https:\/\/([^.]+)\.gigrawars\.de/)?.[1];
        raw = raw.replaceAll(new RegExp('<img[^>]+src="([^">]+)".*>', 'g'), '');
        raw = raw.replaceAll(/gigrawars\.de/g, '');

        const tables = [...raw.matchAll(/<table.*?<\/table>/gs)];

        const serverInfo = document.createElement('p');
        const events = document.createElement('p');
        serverInfo.innerHTML = tables.shift();
        events.innerHTML = tables.pop();

        const buildingRows = events.querySelectorAll(".itemBuildingList");
        const researchRow = events.querySelector("span[data-page='game_research_index']")?.parentNode.parentNode;

        this.serverTime = gwToMilliseconds(serverInfo.querySelector("td:nth-child(2)").textContent);
        this.player = serverInfo.querySelector("b").textContent;

        this.research = researchRow && this.queueEntry(researchRow, FACTORY.FZ);

        buildingRows.forEach((row) =>
            this.buildings.push(this.queueEntry(row, FACTORY.KZ))
        )
    }

    queueEntry(row, factory) {
        return {
            timeLeft: row.querySelector('.countTime').dataset.time - (this.serverTime / 1000),
            coords: row.querySelector('.switchToCoordinate').dataset.coordinate,
            type: row.querySelector("td:nth-child(2)").textContent.split(' Stufe')[0].trim(),
            factory
        };
    }
}