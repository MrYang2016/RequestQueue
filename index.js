const Event = require('./Event.js');

class RequestQueue {
  constructor() {
    this.requires = [];
    this.currentRun = null;
  }

  enqueue(fun, ...params) {
    const timetamp = new Date().getTime();
    const event = new Event();
    this.requires.push({ timetamp, fun, params, event });
    if (this.currentRun === null) {
      this.run();
    }
    const resultObj = {
      timetamp,
      subscribe: fun => {
        event.subscribe(fun);
        return resultObj;
      },
      dequeue: () => {
        this.dequeue(timetamp);
        return resultObj;
      }
    }
    return resultObj;
  }

  dequeue(timetamp) {
    if (this.requires.length === 0) return;
    for (let i = 0, len = this.requires.length; i < len; i++) {
      if (this.requires[i].timetamp === timetamp) {
        this.requires.splice(i);
      }
    }
    return this;
  }

  run() {
    if (this.requires.length === 0) return;
    this.currentRun = this.requires.shift();
    const { fun, params = [], event } = this.currentRun;
    fun(...params).then((...result) => {
      if (this.requires.length > 0) {
        this.run();
      } else {
        this.currentRun = null;
      }
      event.publish(...result);
    });
  }
}

const queue = new RequestQueue();
const p1 = (name) => new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve('p1' + name);
  }, 1000);
});
const p2 = () => new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve('p2');
  }, 500);
});
const p3 = () => new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve('p3');
  }, 800);
});
queue.enqueue(p1, 'yang').subscribe(console.log).subscribe(console.log);
queue.enqueue(p2).subscribe(console.log).dequeue();
queue.enqueue(p3).subscribe(console.log);