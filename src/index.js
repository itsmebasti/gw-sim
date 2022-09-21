import { createElement } from 'lwc';
import App from 'gw/app';

document.querySelector('body')
    .appendChild(createElement('gw-app', { is: App }));
