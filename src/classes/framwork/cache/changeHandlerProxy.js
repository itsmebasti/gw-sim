import {trueTypeOf} from "../misc/trueTypeOf";

export default class ChangeHandlerProxy {
	onChangeCallback;
	
	constructor(original, handler) {
		this.onChangeCallback = handler;
		return new Proxy(original, this);
	}
	
	
	get(original, property, receiver) {
		let result = Reflect.get(...arguments);
		
		if(["Object", "Array"].includes(trueTypeOf(result))) {
			result = new ChangeHandlerProxy(result, () => this.onChangeCallback(original));
		}
		
		return result;
	}
	
	set(original, property, value) {
		Reflect.set(...arguments);
		
		this.onChangeCallback(original);
		
		return true;
	}
	
	deleteProperty(original, property) {
		const result = Reflect.deleteProperty(...arguments);
		
		this.onChangeCallback(original);
		
		return result;
	}
}