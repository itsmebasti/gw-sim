import SldsWebComponent from '../../../classes/framwork/misc/sldsWebComponent';

export default class App extends SldsWebComponent {
    _selected = 'pathfinder';
    items = {
        overview: { title: 'Gesamt-übersicht', iconName: "decision", iconCss: "forecasts", beta: true },
        pathfinder: { title: 'Pathfinder', iconName: "trailhead", iconCss: "stage-collection"},
        fleets: { title: 'Flotten-übersicht', iconName: "activations", iconCss: "activations", beta: true, error: true },
    };
    
    connectedCallback() {
        this.selected = window.location.hash?.substring(1);
        window.onpopstate = ({ state }) => this.selected = state?.page;
    }
    
    renderedCallback() {
        document.body.scrollTop = document.documentElement.scrollTop = 0;
    }
    
    select({currentTarget : { dataset : {page} }}) {
        this.selected = page;
    }
    
    refreshContent(evt) {
        this.template.querySelectorAll('.gw-components > *')
            .forEach((cmp) => cmp.refresh?.(evt.detail ?? undefined)); // detail defaults to null
    }
    
    set selected(page) {
        if(page in this.items) {
            this._selected = page;
            
            window.history.replaceState( { page },null,'#'+page);
        }
    }
    
    get selected() {
        return this._selected;
    }
    
    get itemList() {
        return Object.entries(this.items).map(([page, item]) => {
            item.page = page;
            item.icon = '/assets/icons/standard-sprite/svg/symbols.svg#'+item.iconName;
            item.css = 'slds-icon_container slds-icon-standard-'+item.iconCss;
            item.visible = (page === this.selected && !item.error);
            item.liCss = 'slds-vertical-tabs__nav-item' + (item.visible ? ' slds-is-active' : '');
            return item;
        });
    }
}
