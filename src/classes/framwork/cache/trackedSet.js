export default  class TrackedSet extends Set {
	onChangeCallback;
	
	constructor(values, handler) {
		super(values);
		
		this.onChangeCallback = handler;
	}
	
	add(value) {
		super.add(value);
		// Note: add is already called in the super constructor when the callback is not defined yet and that's good
		this.onChangeCallback && this.onChangeCallback(this);
	}
	
	delete(value) {
		super.delete(value);
		this.onChangeCallback(this);
	}
	
	clear() {
		super.clear();
		this.onChangeCallback(this);
	}
}