#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var TestResultState;
(function (TestResultState) {
    TestResultState[TestResultState["RUNNING"] = 0] = "RUNNING";
    TestResultState[TestResultState["SUCCESS"] = 1] = "SUCCESS";
    TestResultState[TestResultState["FAILED"] = 2] = "FAILED";
})(TestResultState || (TestResultState = {}));
var TestRunner = /** @class */ (function () {
    function TestRunner() {
    }
    TestRunner.testFile = function (dir, file) {
        if (file.startsWith('.'))
            return;
        if (file === 'node_modules')
            return;
        var stat = fs.lstatSync(path.join(dir, file));
        var isDir = stat.isDirectory();
        if (isDir) {
            return TestRunner.testDirectory(path.join(dir, file));
        }
        if (file.endsWith('Test.js')) {
            var test_1 = require(path.resolve(dir, file));
            var testNames = Object.keys(test_1).filter(function (file) { return file.endsWith('Test'); });
            testNames.forEach(function (testName) {
                var testClassName = testName;
                var testClass = test_1[testClassName];
                var testMethodNames = Object.keys(testClass);
                testMethodNames.forEach(function (methodName) {
                    var testResult = {
                        state: TestResultState.RUNNING,
                        file: path.resolve(dir, file),
                        className: testClassName,
                        methodName: methodName
                    };
                    function testSuccess() {
                        testResult.state = TestResultState.SUCCESS;
                    }
                    function testFailed(err) {
                        testResult.state = TestResultState.FAILED;
                        testResult.result = err;
                    }
                    TestRunner._results.push(testResult);
                    try {
                        var result = testClass[methodName]();
                        if (TestRunner.isPromise(result)) {
                            testResult.promise = result;
                            result.then(testSuccess, testFailed);
                        }
                        else {
                            testSuccess();
                        }
                    }
                    catch (err) {
                        testFailed(err);
                    }
                });
            });
        }
    };
    TestRunner.testDirectory = function (dir) {
        fs.readdirSync(dir).forEach(TestRunner.testFile.bind(undefined, dir));
    };
    TestRunner.printResults = function () {
        var testCount = TestRunner._results.length;
        var runningCount = 0;
        var successCount = 0;
        var failedCount = 0;
        var errorResults = [];
        var promises = [];
        TestRunner._results.forEach(function (result) {
            switch (result.state) {
                case TestResultState.RUNNING:
                    runningCount += 1;
                    promises.push(result.promise);
                    return;
                case TestResultState.SUCCESS:
                    successCount += 1;
                    return;
                case TestResultState.FAILED:
                    failedCount += 1;
                    errorResults.push(result);
                    return;
            }
        });
        if (promises.length) {
            // @ts-ignore
            Promise.allSettled(promises).then(TestRunner.printResults)["catch"](function (err) {
                console.error('ERROR: ', err);
            });
        }
        else {
            if (failedCount >= 1) {
                console.error(failedCount + " (of " + testCount + ") tests failed:\n");
                errorResults.forEach(function (testResult) {
                    console.error("[" + testResult.file + "] " + testResult.className + "." + testResult.methodName + " failed: ", testResult.result, '\n');
                });
            }
            else {
                console.log("All " + testCount + " tests successfully executed.");
            }
        }
    };
    TestRunner.isPromise = function (value) {
        return !!(value.then && value["catch"]);
    };
    TestRunner._results = [];
    return TestRunner;
}());
TestRunner.testDirectory('./dist');
TestRunner.printResults();
