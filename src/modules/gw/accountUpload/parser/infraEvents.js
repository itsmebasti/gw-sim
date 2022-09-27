import { FACTORY } from '../../../../classes/model/static/types';

export default class InfraEvents {
    research;
    buildings = [];

    constructor(raw, serverInfo) {
        raw = raw.replaceAll(/'<img[^>]+src="([^">]+)".*>/g, '');
        raw = raw.replaceAll(/gigrawars\.de/g, '');

        const events = document.createElement('p');
        events.innerHTML = [...raw.matchAll(/<table.*?<\/table>/gs)].pop();

        const buildingRows = events.querySelectorAll(".itemBuildingList");
        const researchRow = events.querySelector("span[data-page='game_research_index']")?.parentNode.parentNode;

        this.research = researchRow && this.queueEntry(researchRow, FACTORY.FZ);

        buildingRows.forEach((row) =>
            this.buildings.push(this.queueEntry(row, FACTORY.KZ, serverInfo.serverTime))
        )
    }

    queueEntry(row, factory, serverTime) {
        return {
            timeLeft: row.querySelector('.countTime').dataset.time - serverTime/1000,
            coords: row.querySelector('.switchToCoordinate').dataset.coordinate,
            type: row.querySelector("td:nth-child(2)").textContent.split(' Stufe')[0].trim(),
            factory
        };
    }
}