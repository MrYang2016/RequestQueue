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
  unSubscribe(fun) {
    this.eventFun = this.eventFun.filter(f => f !== fun);
  }
}
module.exports = Event;