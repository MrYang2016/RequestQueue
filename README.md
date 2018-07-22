## 请求队列
> 当前端请求多个不同接口时，如果各个请求有相关联，执行时需要先后顺序，这时需要同步请求。而浏览器端的请求一般为异步请求，这时你可以将下一个请求放在上一个请求的回调函数中，即第一个请求成功后再执行第二个请求。但这样做会导致需要嵌套多层函数，使代码不美观。而且也不够灵活，比如两个请求间有其它操作。所以这时可以使用请求队列。

### [github地址](https://github.com/MrYang2016/RequestQueue)
 
### 一、队列
队列是一种线性表，特性是先进先出，即先放进队列中的值，取的时候先出来，并删除。
### 二、请求队列
顾名思义，就是将需要的请求先放进队列中，然后按照先进先出的原则，从队列中拿出请求并一个一个地执行。这样就实现请求同步，使同步请求写起来更灵活。
### 三、实现
这里使用es6去实现，主要是利用class去建立类。如
```
class RequestQueue {
  constructor() {
	// 存放请求
    this.requires = [];
    // 当前正在执行的请求
    this.currentRun = null;
  }
}
```
该类的主要操作是，将请求放入队列中等待请求、删除放入队列中的请求。将请求放入队列中就是将请求函数直接放进上面的``requires``数组中。如
```
// 请求入列，参数为请求的函数以及对应的请求参数
enqueue(fun, ...params) {
    // 使用时间戳作为该请求的唯一标识
	const timetamp = new Date().getTime();
	// 事件通知，请求完成后，可以使用这个来通知
	const event = new Event();
    // 发生错误时触发事
    const errorEvent = new Event();
	// 将请求的相关信息放入requires数组中，等待请求
	this.requires.push({ timetamp, fun, params, event, errorEvent });
	// 如果请求未开始，则开始请求
	if (this.currentRun === null && !this.paused) {
	 this.run();
	}
	// 返回的操作
	const resultObj = {
	 // 将时间戳返回，方便删除请求
	 timetamp,
	 // 订阅请求结果，这里主要是利用event，实现请求成功后执行对应的函数
	 subscribe: fun => {
	   if (fun instanceof Function) {
        event.subscribe(fun);
       }
	   return resultObj;
	 },
	 // 取消订阅
	 unSubscribe: fun => {
        event.unSubscribe(fun);
        return resultObj;
      },
      // 错误监听
      onError: fun => {
        errorEvent.subscribe(fun);
        return resultObj;
      },

	 // 删除请求
	 dequeue: () => {
	   this.dequeue(timetamp);
	   return resultObj;
	 }
	}
	return resultObj;
}
```
Event为观察者模式实现，主要用来监听请求成功事件，具体实现如下
```
class Event {
  constructor() {
    this.eventFun = [];
  }
  // 发布
  publish(...params) {
    this.eventFun.forEach(fun => {
      fun(...params);
    });
  }
  // 取消订阅
  unSubscribe(fun) {
    this.eventFun = this.eventFun.filter(f => f !== fun);
  }
  // 订阅
  subscribe(fun) {
    this.eventFun.push(fun);
  }
}
```
开始执行请求的操作由函数run来实现，如
```
run() {
    if (this.requires.length === 0) return;
    this.paused = false;
    this.currentRun = this.requires.shift();
    const { fun, params = [], event, errorEvent } = this.currentRun;
    let isOverRun = false;
    // 请求超时处理
    this.timeout = setTimeout(() => {
      isOverRun = true;
      runNext.call(this);
    }, this.overTime);
    // 开始请求
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
```
删除队列中的请求操作。如
```
// 主要根据时间戳来查找并删除
dequeue(timetamp) {
    if (this.requires.length === 0) return;
    for (let i = 0, len = this.requires.length; i < len; i++) {
      if (this.requires[i].timetamp === timetamp) {
        this.requires.splice(i);
      }
    }
    return this;
}
```
清除队列所有请求。如
```
clear() {
    this.requires = [];
}
```
### 四、测试
```
const queue = new RequestQueue();
// 使用setTimeout来模仿接口请求
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
```
以上输出为
```
p1yang
p1yang
p3
```
因为第一个请求订阅了两次，所以输出两个。而第二给请求执行了``dequeue``，所以被删除了，没有输出。


