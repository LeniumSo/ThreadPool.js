//! ThreadPool.js
//! version : 1.0.0
//! authors : LeniumSo
//! license : MIT
//! https://github.com/LeniumSo/ThreadPool.js

; (function () {

    var isAvailable = !!window.Worker;

    function guid() {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }

    var _workersPool = [];
    var _queue = [];

    var ThreadPool = {
        workersPoolSize: 5,
        isDebugging: false,
        isAvailable: isAvailable
    };

    function onWorkerMessage(workerId, data) {
        var worker;

        for (var i = 0; i < _workersPool.length; i++) {
            if (_workersPool[i].id == workerId) {
                worker = _workersPool[i];
                break;
            }
        }

        if (worker) {
            worker.isIdle = true;

            if (ThreadPool.isDebugging || data.isError) {
                if (data.isError) {
                    console.error('Worker: ' + workerId, data);
                } else {
                    console.info('Worker: ' + workerId, data);
                }
            }

            if (data.isError) {
                worker.reject(data.errorMessage);
            } else {
                worker.resolve(data.result);
            }
        }
    }

    function createWorker() {
        function workerFunction() {
            var self = this;

            self.onmessage = function (e) {
                var result = {
                    isError: false,
                    processingMs: 0,
                    result: null,
                    errorMessage: null
                };

                var startTime = (new Date()).getTime();

                try {
                    var processFunction = new Function('return ' + e.data.processFunction)();
                    var processArguments = e.data.processArguments;

                    result.result = processFunction.apply(null, processArguments);

                } catch (ex) {

                    result.isError = true;
                    result.errorMessage = ex.toString();

                }

                result.processingMs = (new Date()).getTime() - startTime;

                self.postMessage(result);
            }
        }

        var dataObj = '(' + workerFunction + ')();';
        var blob = new Blob([dataObj.replace('"use strict";', '')]);

        var blobURL = (window.URL ? URL : webkitURL).createObjectURL(blob, {
            type: 'application/javascript; charset=utf-8'
        });

        var id = guid();
        var worker = new Worker(blobURL);

        worker.onmessage = function (e) {
            var data = e.data;

            onWorkerMessage(id, data);
        };

        return {
            id: id,
            worker: worker,
            isIdle: true,
            resolve: null,
            reject: null
        }
    }

    function createWorkersPool() {
        for (var i = 0; i < ThreadPool.workersPoolSize; i++) {
            _workersPool.push(createWorker());
        }
    }

    ThreadPool.setWorkersPoolSize = function (size) {
        if (!isAvailable)
            return;

        if (!size)
            size = 0;
        _workersPool.forEach(function (worker) {
            worker.worker.terminate();
        });

        ThreadPool.workersPoolSize = size;

        _workersPool = [];

        createWorkersPool();
    };

    function update() {
        if (_queue && _queue.length) {

            var idleWorker;

            for (var i = 0; i < _workersPool.length; i++) {
                if (_workersPool[i].isIdle) {
                    idleWorker = _workersPool[i];
                    break;
                }
            }

            if (idleWorker) {
                var firstItem = _queue[0];
                _queue.shift();

                idleWorker.isIdle = false;
                idleWorker.resolve = firstItem.resolve;
                idleWorker.reject = firstItem.reject;

                idleWorker.worker.postMessage({
                    processFunction: firstItem.processFunction,
                    processArguments: firstItem.processArguments,
                });
            }
        }
    }

    ThreadPool.run = function (func, args) {
        return new Promise(function (resolve, reject) {

            if (isAvailable) {
                _queue.push({
                    processFunction: func.toString(),
                    processArguments: args,
                    resolve: resolve,
                    reject: reject
                });
            } else {

                try {
                    resolve(func.apply(null, args));
                } catch (e) {
                    reject(e);
                }

            }

        });
    };

    if (isAvailable) {
        createWorkersPool();

        setInterval(update, 1000);
    }

    window.ThreadPool = ThreadPool;

    return ThreadPool;
})()