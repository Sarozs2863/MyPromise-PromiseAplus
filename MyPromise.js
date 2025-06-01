// 三种状态的定义
const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

class MyPromise {
  // 构造函数,传入executor
  constructor(executor) {
    // 初始化为pending
    this.status = PENDING;
    // 成功的结果
    this.value = undefined;
    // 失败的理由
    this.reason = undefined;
    // 观察者模式
    // 成功时的需要执行的队列
    this.onFulfilledCallbacks = [];
    // 失败时要执行的队列
    this.onRejectedCallbacks = [];

    const self = this

    // 交给executor使用，让它成功时
    // 1)将MyPromise状态改为fulfilled
    // 2)保存成功的结果
    // 3)触发等待队列的执行（观察者模式）
    // 使用箭头函数是因为要保证this指向仍然为实例
    const resolve = (value) => {
      // 注意！！！只能由pending转换为fulfilled
      if (self.status === PENDING) {
        self.status = FULFILLED;
        self.value = value;
        self.onFulfilledCallbacks.forEach((callback) => callback());
      }
    };
    // 和resolve是对称的，fulfilled和rejected是平行对立的两种状态
    const reject = (reason) => {
      if (self.status === PENDING) {
        self.status = REJECTED;
        self.reason = reason;
        self.onRejectedCallbacks.forEach((callback) => callback());
      }
    };
    // 立即尝试执行executor
    try {
      executor(resolve, reject);
    } catch (e) {
      // executor执行出错则直接reject Promise
      reject(e);
    }
  }

  // then方法，用于访问最终的结果
  then(onFulfilled, onRejected) {
    // 如果没有传入onFulfilled，则定义默认的onFulfilled:将访问到的结果原封不动的返回
    onFulfilled =
      typeof onFulfilled === "function" ? onFulfilled : (value) => value;
    // 如果没有传入onRejected，则定义默认的onRejected:将访问到的reason作为错误抛出，以便被catch块捕获，实现错误穿透
    onRejected =
      typeof onRejected === "function"
        ? onRejected
        : (reason) => {
          throw reason;
        };

    const currentPromise = this;
    // then方法要实现链式调用，必须返回一个Promise对象！
    // 且需要用onFulfilled或onRejected的结果来完结MyPromise2
    const MyPromise2 = new MyPromise((resolve, reject) => {
      // 具体怎么利用onFulfilled和onRejected是依据当前的Promise的状态的
      if (currentPromise.status === FULFILLED) {
        // 添加微任务
        queueMicrotask(() => {
          // 尝试使用onFulfilled得到回调函数处理后的结果
          try {
            const result = onFulfilled(currentPromise.value);
            // result的类型可能有很多，需要专门定义一个MyPromise完结函数
            resolveMyPromise(MyPromise2, result, resolve, reject);
          } catch (e) {
            // 失败则 reject MyPromise2 with e
            reject(e);
          }
        });
      } else if (currentPromise.status === REJECTED) {
        queueMicrotask(() => {
          try {
            const result = onRejected(currentPromise.reason);
            resolveMyPromise(MyPromise2, result, resolve, reject);
          } catch (e) {
            // !! 错误穿透就是在这里捕获到的！！
            reject(e);
          }
        });
      } else if (currentPromise.status === PENDING) {
        // 为了增加可读性没有用else
        this.onFulfilledCallbacks.push(() => {
          queueMicrotask(() => {
            // 尝试使用onFulfilled得到回调函数处理后的结果
            try {
              const result = onFulfilled(currentPromise.value);
              // result的类型可能有很多，需要专门定义一个MyPromise完结函数
              resolveMyPromise(MyPromise2, result, resolve, reject);
            } catch (e) {
              // 失败则 reject MyPromise2 with e
              reject(e);
            }
          });
        });

        this.onRejectedCallbacks.push(() => {
          queueMicrotask(() => {
            try {
              const result = onRejected(currentPromise.reason);
              resolveMyPromise(MyPromise2, result, resolve, reject);
            } catch (e) {
              // !! 错误穿透就是在这里捕获到的！！
              reject(e);
            }
          });
        });
      }
    });

    return MyPromise2;
  }

  catch(onRejected) {
    return this.then(null, onRejected)
  }
}


const resolveMyPromise = (MyPromiseNeededBeResolved, x, resolve, reject) => {
  // x就是用来完结MyPromise的依据
  // x是thenable的话，需要用x完结的结果来完结MyPromiseNeededBeResolved
  // （也就是在then中完结需要用x完结的结果来完结MyPromiseNeededBeResolved
  // 而不是x这个thenable本身，我们要的是结果,then本身就是用来接触结果的
  if (MyPromiseNeededBeResolved === x) {
    // 我们不能等自己处理完了出结果了再开始，悖论
    reject(TypeError("x can be MyPromiseNeededBeResolved!"));
  } else if ((x && typeof x === "object") || typeof x === "function") {
    // 用最优先的那个解决一次
    let used = false;
    try {
      // 尝试获取then方法3
      const then = x.then;
      // 判断then是不是真的存在的方法
      if (typeof then === "function") {
        then.call(
          x,
          (valueOfSuccess) => {
            if (!used) {
              resolveMyPromise(
                MyPromiseNeededBeResolved,
                valueOfSuccess,
                resolve,
                reject,
              );
              used = true;
            }
          },
          (reasonOfFailure) => {
            if (!used) {
              reject(reasonOfFailure);
              used = true;
            }
          },
        );
      } else {
        // 不是真的thenable
        // 直接用x本身resolve
        if (!used) {
          resolve(x);
          used = true;
        }
      }
    } catch (e) {
      if (!used) {
        reject(e);
        used = true;
      }
    }
  } else {
    resolve(x);
  }
};

MyPromise.resolve = (value) => {
  // 如果value是Promise，则直接返回value
  if (value instanceof MyPromise) return value

  return new MyPromise((resolve, reject) => {
    // thenable
    if (value && value.then && typeof value.then === 'function') {
      value.then(resolve, reject)
    }
    // 其他
    else {
      resolve(value)
    }
  })
}
/*
限流该怎么做？
- 同一时间内，只能有limit个Promise在执行中
- 问题
  - 可是Promise在创建时executor就会执行
    - 怎么解决？
      - 只传入需要执行的函数队列
      - 并且给定一个limit值
      - 内部同一时间下最多只能存在limit个pending的Promise
  - 怎么保证顺序的正确性？
    - 在then中指明
  - 怎么保证limit个？
    - 先加上5个
    - 下一个上一个
      - 如果还有的话
      - 具体怎么做？
        - 像递归一样
  - 什么情况下结束？
    - fulfilled数量 = executors.length
*/
MyPromise.limitAll = function (executors, limit) {
  return new Promise((resolve, reject) => {

    let result = new Array(executors.length).fill(undefined)
    let nextIndex = limit
    let fulfilledCount = 0

    const makeNewPromise = (index) => {
      new Promise(executors[index])
        .then(
          value => {
            fulfilledCount++
            result[index] = value
            if (nextIndex < executors.length) {
              makeNewPromise(nextIndex++)
            }
            if (fulfilledCount === executors.length) {
              resolve(result)
            }
          }
        ).catch(err => reject(err))
    }

    for (let i = 0; i < limit; i++) {
      makeNewPromise(i)
    }
  })
}

MyPromise.all = function (promises) {
  return new Promise((resolve, reject) => {
    let index = 0
    let result = []
    if (promises.length = 0) {
      resolve(result)
    } else {
      function processValue(i, data) {
        result[i] = data
        if (++index === promises.length) {
          resolve(result)
        }
      }

      for (let i = 0; i < promises.length; i++) {
        Promise.resolve(promises[i]).
          then(value => processValue(i, value),
            (err) => {
              reject(err)
              return
            }
          )
      }
    }
  })
}
/*
思路：
- 关键是什么？
  - 找到第一个fulfilled就解决要返回的Promise
    - 怎么实现？
      - promises遍历
      - 每一个都指明then和catch
*/
MyPromise.race = function (promises) {
  // 返回MyPromise
  return new MyPromise((resolve, reject) => {
    // 遍历Promises
    for (const promise of promises) {
      MyPromise.resolve(promise)
        .then(value => resolve(value))
        .catch(err => reject(err))
    }
    // 如果promises为空，Promise永远为pending
    return
  })
}

MyPromise.reject = (reason) => {
  // 原封不动的用reason reject MyPromise
  return new MyPromise((resolve, reject) => {
    reject(reason)
  })
}

// 为了兼容promises-aplus-tests测试工具
MyPromise.deferred = function () {
  const result = {};
  result.promise = new MyPromise((resolve, reject) => {
    result.resolve = resolve;
    result.reject = reject;
  });
  return result;
};

module.exports = MyPromise; // 导出MyPromise