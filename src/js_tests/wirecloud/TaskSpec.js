/*
 *     Copyright (c) 2016 CoNWeT Lab., Universidad Politécnica de Madrid
 *
 *     This file is part of Wirecloud Platform.
 *
 *     Wirecloud Platform is free software: you can redistribute it and/or
 *     modify it under the terms of the GNU Affero General Public License as
 *     published by the Free Software Foundation, either version 3 of the
 *     License, or (at your option) any later version.
 *
 *     Wirecloud is distributed in the hope that it will be useful, but WITHOUT
 *     ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 *     FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public
 *     License for more details.
 *
 *     You should have received a copy of the GNU Affero General Public License
 *     along with Wirecloud Platform.  If not, see
 *     <http://www.gnu.org/licenses/>.
 *
 */

/* globals Wirecloud */


(function () {

    "use strict";

    describe("Task", function () {

        describe("new Task(title, executor)", function () {

            it("throws and exception if title is missing", function () {
                expect(function () {
                    new Wirecloud.Task();
                }).toThrow(jasmine.any(TypeError));
            });

            it("throws and exception if executor parameter is missing", function () {
                expect(function () {
                    new Wirecloud.Task("title");
                }).toThrow(jasmine.any(TypeError));
            });

            it("throws and exception if executor parameter is not a function", function () {
                expect(function () {
                    new Wirecloud.Task("title", "a");
                }).toThrow(jasmine.any(TypeError));
            });

            it("provides initial values for the task properties", function () {
                var task = new Wirecloud.Task("task", function () {
                });
                expect(task.progress).toEqual(0);
                expect(task.title).toEqual("task");
                expect(task.status).toEqual("pending");
            });

            it("should allow immediate fulfillment", function () {
                var value = "task value";
                var task = new Wirecloud.Task("task", function (fulfill, reject, update) {
                    fulfill(value);
                });
                expect(task.progress).toEqual(100);
                expect(task.status).toEqual("resolved");
                expect(task.title).toEqual("task");
                expect(task.value).toEqual(value);
            });

            it("should allow immediate rejection", function () {
                var value = "task value";
                var task = new Wirecloud.Task("task", function (resolve, reject, update) {
                    reject(value);
                });
                expect(task.progress).toEqual(0);
                expect(task.status).toEqual("rejected");
                expect(task.title).toEqual("task");
                expect(task.value).toEqual(value);
            });

            it("should allow progress updates", function () {
                var task_update;
                var task = new Wirecloud.Task("task", function (resolve, reject, update) {
                    task_update = update;
                });

                task_update(20);

                expect(task.progress).toEqual(20);
                expect(task.status).toEqual("pending");
                expect(task.title).toEqual("task");
            });

            it("should normalize less than zero values on progress updates", function () {
                var task_update;
                var task = new Wirecloud.Task("task", function (resolve, reject, update) {
                    task_update = update;
                });

                task_update(-20);

                expect(task.progress).toEqual(0);
                expect(task.status).toEqual("pending");
                expect(task.title).toEqual("task");
            });

            it("should normalize greater than one hundred values on progress updates", function () {
                var task_update;
                var task = new Wirecloud.Task("task", function (resolve, reject, update) {
                    task_update = update;
                });

                task_update(120);

                expect(task.progress).toEqual(100);
                expect(task.status).toEqual("pending");
                expect(task.title).toEqual("task");
            });

            it("throws an exception when resolving an already resolved tasks", function () {
                var task_resolve;
                var resolve_value = "success";
                var task = new Wirecloud.Task("task", function (resolve, reject, update) {
                    task_resolve = resolve;
                    resolve(resolve_value);
                });

                expect(function () {
                    task_resolve("second resolve");
                }).toThrow();

                expect(task.progress).toEqual(100);
                expect(task.status).toEqual("resolved");
                expect(task.value).toBe(resolve_value);
            });

            it("throws an exception when rejecting an already resolved tasks", function () {
                var task_reject;
                var resolve_value = "success";
                var task = new Wirecloud.Task("task", function (resolve, reject, update) {
                    task_reject = reject;
                    resolve("success");
                });

                expect(function () {
                    task_reject("fail");
                }).toThrow();

                expect(task.progress).toEqual(100);
                expect(task.status).toEqual("resolved");
                expect(task.value).toBe(resolve_value);
            });

            it("throws an exception when updating an already resolved tasks", function () {
                var task_update;
                var resolve_value = "success";
                var task = new Wirecloud.Task("task", function (resolve, reject, update) {
                    task_update = update;
                    resolve("success");
                });

                expect(function () {
                    task_update(30);
                }).toThrow();

                expect(task.progress).toEqual(100);
                expect(task.status).toEqual("resolved");
                expect(task.value).toBe(resolve_value);
            });

            describe("instances should be Promise compatible:", function () {

                it("rejected task notify promises", function (done) {
                    var expected_reason = "error reason";
                    var task_reject;
                    var task = new Wirecloud.Task("task", function (resolve, reject) {
                        task_reject = reject;
                    });
                    task.catch(function (reason) {
                        expect(reason).toBe(expected_reason);
                        done();
                    });

                    task_reject(expected_reason);
                });

                it("exceptions in the onFulfilled listener are progated", function (done) {
                    var expected_error;
                    var task = new Wirecloud.Task("task", function (resolve, reject) {
                        resolve("success");
                    });
                    task.then(function (value) {
                        expected_error = new Error();
                        throw expected_error;
                    }).catch(function (error) {
                        expect(error).toBe(expected_error);
                        done();
                    });
                });

                it("exceptions in the onRejected listener are progated", function (done) {
                    var expected_error;
                    var task = new Wirecloud.Task("task", function (resolve, reject) {
                        reject("error");
                    });
                    task.then(
                        null,
                        function (value) {
                            expected_error = new Error();
                            throw expected_error;
                        }
                    ).catch(
                        function (error) {
                            expect(error).toBe(expected_error);
                            done();
                        }
                    );
                });

                it("catch without return value continue the chain", function (done) {
                    var task = new Wirecloud.Task("task", function (resolve, reject) {
                        reject("error");
                    });
                    task.then(
                        null,
                        function (error) {
                            expect(error).toBe("error");
                        }
                    ).then(
                        function (value) {
                            expect(value).toBe(undefined);
                            done();
                        }
                    );
                });

                it("Task can be returned in a Promise's then callback", function () {
                    var success_value = "success value";
                    var build_task = function build_task() {
                        return new Wirecloud.Task("task", function (fulfill, reject, update) {
                            fulfill(success_value);
                        });
                    };
                    Promise.resolve().then(build_task).then(function (value) {
                        expect(value).toBe(success_value);
                    });
                });

                it("Promises can be returned in a Task's then callback", function () {
                    var success_value = "success value";
                    var build_promise = function () {
                        return Promise.resolve(success_value);
                    };
                    var task = new Wirecloud.Task("task", function (fulfill, reject, update) {
                        fulfill(success_value);
                    });
                    task.then(build_promise).then(function (value) {
                        expect(value).toBe(success_value);
                    });
                });

                it("values can be returned in a Task's then callback", function () {
                    var success_value = "success value";
                    var build_value = function () {
                        return success_value;
                    };
                    var task = new Wirecloud.Task("task", function (fulfill, reject, update) {
                        fulfill(success_value);
                    });
                    task.then(build_value).then(function (value) {
                        expect(value).toBe(success_value);
                    });
                });

            });

            describe("should support task aggregations:", function () {

                it("requires at least one subtask", function () {
                    expect(() => {
                        new Wirecloud.Task("parallel work", []);
                    }).toThrowError(TypeError);
                });

                it("immediate fulfillment", function () {
                    var subtask1 = new Wirecloud.Task("task", (fulfill, reject, update) => {
                        fulfill("1");
                    });
                    var subtask2 = new Wirecloud.Task("task", (fulfill, reject, update) => {
                        fulfill("2");
                    });


                    var task = new Wirecloud.Task("parallel work", [subtask1, subtask2]);


                    expect(task.progress).toEqual(100);
                    expect(task.status).toEqual("resolved");
                    expect(task.title).toEqual("parallel work");
                    expect(task.value).toEqual(["1", "2"]);
                    expect(task.subtasks).toEqual([subtask1, subtask2]);
                });

                it("immediate rejection", function () {
                    // aggregations only require one rejected subtask to be considered rejected
                    var subtask1 = new Wirecloud.Task("task", function (fulfill, reject, update) {
                        reject("1");
                    });
                    var subtask2 = new Wirecloud.Task("task", function (fulfill, reject, update) {
                        fulfill("2");
                    });


                    var task = new Wirecloud.Task("parallel work", [subtask1, subtask2]);


                    expect(task.progress).toEqual(50);
                    expect(task.status).toEqual("rejected");
                    expect(task.title).toEqual("parallel work");
                    expect(task.value).toEqual(["1", "2"]);
                    expect(task.subtasks).toEqual([subtask1, subtask2]);
                });

                it("async resolution", function () {
                    var fulfill_methods = [];
                    var subtask1 = new Wirecloud.Task("task", function (fulfill, reject, update) {
                        fulfill_methods.push(fulfill);
                    });
                    var subtask2 = new Wirecloud.Task("task", function (fulfill, reject, update) {
                        fulfill_methods.push(fulfill);
                    });


                    var task = new Wirecloud.Task("parallel work", [subtask1, subtask2]);

                    expect(task.progress).toEqual(0);
                    expect(task.status).toEqual("pending");
                    expect(task.title).toEqual("parallel work");
                    expect(task.value).toEqual(undefined);
                    expect(task.subtasks).toEqual([subtask1, subtask2]);

                    fulfill_methods[0]("1");
                    expect(task.progress).toEqual(50);
                    expect(task.status).toEqual("pending");

                    fulfill_methods[1]("2");
                    expect(task.progress).toEqual(100);
                    expect(task.status).toEqual("resolved");
                });

                it("subtasks can be aborted", function () {
                    // aggregations only require one rejected subtask to be considered rejected
                    var subtask1 = new Wirecloud.Task("task", function (fulfill, reject, update) {});
                    var subtask2 = new Wirecloud.Task("task", function (fulfill, reject, update) {
                        fulfill("2");
                    });


                    var task = new Wirecloud.Task("parallel work", [subtask1, subtask2]);

                    subtask1.abort();

                    expect(task.progress).toEqual(50);
                    expect(task.status).toEqual("aborted");
                    expect(task.subtasks).toEqual([subtask1, subtask2]);
                });

            });

        });

        describe("abort()", function () {

            it("should work on unabortable tasks", function () {
                var task = new Wirecloud.Task("task", function () {});

                expect(task.abort()).toBe(task);

                expect(task.status).toBe("aborted");
                expect(task.value).toBe(undefined);
            });

            it("should do nothing if the task has been aborted previously", function () {
                var task = new Wirecloud.Task("task", function () {});
                expect(task.abort()).toBe(task);

                expect(task.abort()).toBe(task);

                expect(task.status).toBe("aborted");
                expect(task.value).toBe(undefined);
                expect(task.progress).toBe(0);
            });

            it("should do nothing if the task has been resolved previously", function () {
                var task = new Wirecloud.Task("task", function (resolve) {resolve("a");});

                expect(task.abort()).toBe(task);

                expect(task.status).toBe("resolved");
                expect(task.value).toBe("a");
                expect(task.progress).toBe(100);
            });

            it("should do nothing if the task has been rejected previously", function () {
                var task = new Wirecloud.Task("task", function (resolve, reject) {reject("a");});

                expect(task.abort()).toBe(task);

                expect(task.status).toBe("rejected");
                expect(task.value).toBe("a");
                expect(task.progress).toBe(0);
            });

            it("should make tasks ignore post resolve calls", function () {
                var task_resolve;
                var task = new Wirecloud.Task("task", function (resolve) {
                    task_resolve = resolve;
                });

                expect(task.abort()).toBe(task);
                expect(function () {
                    task_resolve("a");
                }).not.toThrow();

                expect(task.status).toBe("aborted");
                expect(task.value).toBe(undefined);
            });

            it("should make tasks ignore post reject calls", function () {
                var task_reject;
                var reject_value = "exception message";
                var task = new Wirecloud.Task("task", function (resolve, reject) {
                    task_reject = reject;
                });

                expect(task.abort()).toBe(task);
                expect(function () {
                    task_reject(reject_value);
                }).not.toThrow();

                expect(task.status).toBe("aborted");
                expect(task.value).toBe(undefined);
            });

            it("should make tasks ignore post update calls", function () {
                var task_update;
                var task = new Wirecloud.Task("task", function (resolve, reject, update) {
                    update(50);
                    task_update = update;
                });

                expect(task.abort()).toBe(task);
                expect(function () {
                    task_update("a");
                }).not.toThrow();

                expect(task.status).toBe("aborted");
                expect(task.value).toBe(undefined);
                expect(task.progress).toBe(50);
            });

        });

        describe("catch()", function () {

            it("should react on rejected tasks", function (done) {
                var expected_reason = "error reason";
                var task = new Wirecloud.Task("task", function (resolve, reject) {
                    reject(expected_reason);
                });

                task.abort();
                task.catch(function (reason) {
                    expect(reason).toBe(expected_reason);
                    done();
                });
            });

            it("should react on already aborted tasks", function (done) {
                var task = new Wirecloud.Task("task", function () {});
                var expected_reason = "aborted";

                task.abort(expected_reason);

                task.catch(function (reason) {
                    expect(reason).toBe(expected_reason);
                    done();
                });
            });

            it("should catch abort events", function (done) {
                var task = new Wirecloud.Task("task", function () {});
                var expected_reason = "aborted";

                task.catch(function (reason) {
                    expect(reason).toBe(expected_reason);
                    done();
                });

                expect(task.abort(expected_reason)).toBe(task);
            });

            it("propagate success values", function (done) {
                var resolve_value = "success";
                var task = new Wirecloud.Task("task", function (resolve) {
                    resolve(resolve_value);
                });

                task.catch(function (reason) {
                    fail("catch listener was called");
                }).then(function (value) {
                    expect(value).toBe(resolve_value);
                    done();
                });
            });

            it("propagate reject values", function (done) {
                var reject_value = "error";
                var task = new Wirecloud.Task("task", function (resolve, reject) {
                    reject(reject_value);
                });

                task.then(function (value) {
                    fail("onFulfilled listener was called");
                }).catch(function (reason) {
                    expect(reason).toBe(reject_value);
                    done();
                });
            });

        });

        describe("toString()", () => {

            it("should be implemented", () => {
                var task = new Wirecloud.Task("task title", () => {});

                expect(task.toString()).not.toBe("[object Object]");
                expect(task.toString()).toContain("task title");
            });

        });

        describe("toTask(title)", () => {

            it("wraps simple tasks", () => {
                var task_update, task_resolve;

                var subtask = new Wirecloud.Task("subtask title", (resolve, reject, update) => {
                    task_update = update;
                    task_resolve = resolve;
                    update(50);
                });

                var task = subtask.toTask("new task");

                expect(task).not.toBe(subtask);
                expect(task.status).toEqual("pending");
                expect(task.title).toEqual("new task");
                expect(task.value).toEqual(undefined);
                expect(task.subtasks).toEqual([subtask]);
                expect(task.progress).toBe(50);

                task_update(70);
                expect(task.progress).toBe(70);

                task_resolve("final value");
                expect(task.status).toBe("resolved");
                expect(task.value).toBe("final value");
            });

            it("Task sequences can be created using promises", (done) => {
                var success_value = "success value";
                var build_promise = function (value) {
                    return Promise.resolve(value);
                };
                var build_task = function (value) {
                    return new Wirecloud.Task("task", function (fulfill) {
                        fulfill(value);
                    });
                };
                var listener = jasmine.createSpy("listener");

                var initial_task = new Wirecloud.Task("initial task", function (fulfill, reject, update) {
                    fulfill(success_value);
                });
                var task = initial_task.then(build_promise).then(build_task).then(build_promise).toTask("sequence task").on("progress", listener);

                expect(task.title).toEqual("sequence task");

                task.then(function (value) {
                    expect(value).toBe(success_value);
                    expect(task.subtasks).toEqual([
                        jasmine.any(Wirecloud.Task),
                        jasmine.any(Wirecloud.Task),
                        jasmine.any(Wirecloud.Task),
                        jasmine.any(Wirecloud.Task)
                    ]);
                    expect(task.progress).toBe(100);
                    expect(listener.calls.allArgs()).toEqual([
                        [task, 75], // 3 of 4 completed steps
                        [task, 100] // 4 of 4 completed steps
                    ]);
                    done();
                });
            });

            it("Task sequences can be created without using the title parameter", (done) => {
                var success_value = "success value";
                var build_promise = function (value) {
                    return Promise.resolve(value);
                };
                var build_task = function (value) {
                    return new Wirecloud.Task("task", function (fulfill) {
                        fulfill(value);
                    });
                };
                var listener = jasmine.createSpy("listener");

                var initial_task = new Wirecloud.Task("initial task", function (fulfill, reject, update) {
                    fulfill(success_value);
                });
                var task = initial_task.then(build_promise).then(build_task).then(build_promise).toTask().on("progress", listener);

                expect(task.title).toEqual(initial_task.title);

                task.then(function (value) {
                    expect(value).toBe(success_value);
                    expect(task.subtasks).toEqual([
                        jasmine.any(Wirecloud.Task),
                        jasmine.any(Wirecloud.Task),
                        jasmine.any(Wirecloud.Task),
                        jasmine.any(Wirecloud.Task)
                    ]);
                    expect(task.progress).toBe(100);
                    expect(listener.calls.allArgs()).toEqual([
                        [task, 75], // 3 of 4 completed steps
                        [task, 100] // 4 of 4 completed steps
                    ]);
                    done();
                });
            });

        });

    });

})();
