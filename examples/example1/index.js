
function threadFunction(num) {
    function fib(n) {
        return n <= 1 ? n : fib(n - 1) + fib(n - 2);
    }

    return fib(num);
}

ThreadPool.isDebugging = true;

ThreadPool.run(threadFunction, [40]);
ThreadPool.run(threadFunction, [45]);
ThreadPool.run(threadFunction, [40]);
ThreadPool.run(threadFunction, [30]);