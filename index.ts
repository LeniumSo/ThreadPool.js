
interface WorkerEntry {
    id: string,
    worker: Worker,
    isIdle: boolean,
    resolve: any,
    reject: any
}

interface QueueEntry {
    processFunction: string,
    processArguments: any[],
    resolve: any,
    reject: any
}

class ThreadPool {

    static isAvailable = !!window.Worker;

    static _workersPool: WorkerEntry[] = [];
    static _queue: QueueEntry[] = [];

    static workersPoolSize = 5;

    static isDebugging = false;

    static {
        var me = this;

        if (me.isAvailable) {
            me.createWorkersPool();

            setInterval(me.update.bind(me), 1000);
        }
    }

    static onWorkerMessage(workerId: string, data: any) {
        var me = this;

        var worker: WorkerEntry | null = null;

        for (var i = 0; i < me._workersPool.length; i++) {
            if (me._workersPool[i].id == workerId) {
                worker = me._workersPool[i];
                break;
            }
        }

        if (worker) {
            worker.isIdle = true;

            if (me.isDebugging || data.isError) {
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

    static createWorker() {
        var me = this;

        function workerFunction(this: any) {
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

                } catch (ex: any) {

                    result.isError = true;
                    result.errorMessage = ex.toString();

                }

                result.processingMs = (new Date()).getTime() - startTime;

                self.postMessage(result);
            }
        }

        var dataObj = '(' + workerFunction + ')();';
        var blob = new Blob([dataObj.replace('"use strict";', '')]);

        var blobURL = ((window.URL ? URL : webkitURL) as any).createObjectURL(blob, {
            type: 'application/javascript; charset=utf-8'
        });

        var id = me.guid();
        var worker = new Worker(blobURL);

        worker.onmessage = function (e) {
            var data = e.data;

            me.onWorkerMessage(id, data);
        };

        return {
            id: id,
            worker: worker,
            isIdle: true,
            resolve: null,
            reject: null
        }
    }

    static createWorkersPool() {
        var me = this;

        for (var i = 0; i < me.workersPoolSize; i++) {
            me._workersPool.push(me.createWorker());
        }
    }

    static setWorkersPoolSize(size) {
        var me = this;

        if (!me.isAvailable)
            return;

        if (!size)
            size = 0;
        me._workersPool.forEach(function (worker) {
            worker.worker.terminate();
        });

        me.workersPoolSize = size;

        me._workersPool = [];

        me.createWorkersPool();
    }

    static update() {
        var me = this;

        if (me._queue && me._queue.length) {

            var idleWorker;

            for (var i = 0; i < me._workersPool.length; i++) {
                if (me._workersPool[i].isIdle) {
                    idleWorker = me._workersPool[i];
                    break;
                }
            }

            if (idleWorker) {
                var firstItem = me._queue[0];
                me._queue.shift();

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

    static run(func: Function, ...args: any[]) {
        var me = this;

        return new Promise(function (resolve, reject) {

            if (me.isAvailable) {
                me._queue.push({
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
    }

    static guid() {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }
}

window["ThreadPool"] = ThreadPool;

export default ThreadPool;