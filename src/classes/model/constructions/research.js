import Construction from './construction'
import { FACTORY } from '../static/types';

export default class Research extends Construction {
    constructor(describes, level, speed) {
        super(describes, FACTORY.FZ, speed, level);
    }
}