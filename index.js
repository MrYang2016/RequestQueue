const Event = require('./Event.js');

class RequestQueue {
  constructor() {
    this.requires = [];
    this.currentRun = null;
    this.paused = false;
    this.overTime = 5000;
    this.timeout = null;
  }

  enqueue(fun, ...params) {
    const timetamp = new Date().getTime();
    const event = new Event();
    const errorEvent = new Event();
    this.requires.push({ timetamp, fun, params, event, errorEvent });
    if (this.currentRun === null && !this.paused) {
      this.run();
    }
    const resultObj = {
      timetamp,
      subscribe: fun => {
        if (fun instanceof Function) {
          event.subscribe(fun);
        }
        return resultObj;
      },
      unSubscribe: fun => {
        event.unSubscribe(fun);
        return resultObj;
      },
      onError: fun => {
        errorEvent.subscribe(fun);
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
    this.paused = false;
    this.currentRun = this.requires.shift();
    const { fun, params = [], event, errorEvent } = this.currentRun;
    let isOverRun = false;
    this.timeout = setTimeout(() => {
      isOverRun = true;
      runNext.call(this);
    }, this.overTime);
    fun(...params).then((...result) => {
      if (isOverRun) return;
      runNext.call(this);
      event.publish(...result);
    }).catch(err => {
      errorEvent.publish(err);
    });
    function runNext() {
      if (this.timeout) {
        clearTimeout(this.timeout);
        this.timeout = null;
      }
      if (this.requires.length > 0 && !this.paused) {
        this.run();
      } else {
        this.currentRun = null;
      }
    }
  }

  clear() {
    this.requires = [];
  }
}

// 测试
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
const p4 = () => new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve('p4');
  }, 6000);
});
queue.enqueue(p1, 'yang').subscribe(console.log).subscribe(console.log);
queue.enqueue(p2).subscribe(console.log).dequeue();
queue.enqueue(p3).subscribe(console.log);
queue.enqueue(p4).subscribe(console.log);