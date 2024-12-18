# MyPromise

本项目是一个 JavaScript 中 Promise 的自定义实现，旨在帮助理解 Promise 的内部工作原理。它遵循 Promises/A+ 规范，并通过了
`promises-aplus-tests` 测试工具的验证。后续会逐步实现更多的常用Promise静态方法供学习目的参考。

## 核心概念

- **三种状态**:
    - `PENDING`: 初始状态，表示 Promise 既没有成功也没有失败。
    - `FULFILLED`: 操作成功完成，Promise 拥有一个结果值（value）。
    - `REJECTED`: 操作失败，Promise 拥有一个失败原因（reason）。

- **状态转换**:
    - `PENDING` -> `FULFILLED` (通过 `resolve(value)` 触发)
    - `PENDING` -> `REJECTED` (通过 `reject(reason)` 触发)
    - 状态一旦改变为 `FULFILLED` 或 `REJECTED`，就 **不可再变**。

- **`executor`**:
    - `constructor` 接收的函数参数。
    - 负责执行异步操作，并通过调用 `resolve` 或 `reject` 来改变 Promise 的状态。
    - 执行过程中抛出的错误会被捕获并 `reject` Promise。

- **`then` 方法**:
    - 用于注册在 Promise 状态变为 `FULFILLED` 或 `REJECTED` 时要执行的回调函数。
    - `then(onFulfilled, onRejected)` 接收两个可选参数：
        - `onFulfilled`: 当 Promise 状态变为 `FULFILLED` 时执行，接收 `value` 作为参数。
        - `onRejected`: 当 Promise 状态变为 `REJECTED` 时执行，接收 `reason` 作为参数。
    - `then` 方法必须返回一个新的 Promise，以支持链式调用。
    - 支持 **值的穿透**: 如果 `onFulfilled` 或 `onRejected` 不是函数，则会分别将 `value` 或 `reason` 传递给下一个 `then`。
    - 支持 **错误穿透**: 如果 `onRejected` 没有提供或不是函数，错误会被传递到下一个 `then` 的 `onRejected` 处理，或被后续的
      `catch` 捕获。

- **`resolveMyPromise` 函数**:
    - 处理 `then` 方法中回调函数的返回值，并根据其类型决定如何 `resolve` 或 `reject` 新的 Promise。
    - 支持处理返回值为 Promise 或 thenable 对象的情况。
    - 防止循环引用，例如 `promise.then(() => promise)`。

- **微任务 (Microtask)**:
    - 使用 `queueMicrotask` 将 `onFulfilled` 和 `onRejected` 的执行放入微任务队列，确保它们在当前执行栈结束后、事件循环的下一次迭代开始前执行。

## 安装与测试

1. **安装**: 本项目无需安装，直接将 `MyPromise.js` 文件复制到你的项目中即可。
2. **测试**:
    - 安装 `promises-aplus-tests`：
        ```bash
        npm install promises-aplus-tests -D
        ```
    - 在你的 `package.json` 中添加测试脚本：
        ```json
        "scripts": {
          "test": "promises-aplus-tests MyPromise.js"
        }
        ```
    - 运行测试：
        ```bash
        npm test
        ```
    - 在 `MyPromise.js` 的末尾添加了以下代码以支持测试：
        ```javascript
        MyPromise.deferred = function () {
          const result = {};
          result.promise = new MyPromise((resolve, reject) => {
            result.resolve = resolve;
            result.reject = reject;
          });
          return result;
        };

        module.exports = MyPromise;
        ```
