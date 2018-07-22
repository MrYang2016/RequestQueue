class Event {
  constructor() {
    this.eventFun = [];
  }
  publish(...params) {
    this.eventFun.forEach(fun => {
      fun(...params);
    });
  }
  subscribe(fun) {
    this.eventFun.push(fun);
  }
}
module.exports = Event;