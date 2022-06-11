/*
 Copyright (c) 2022 János Veres

 Permission is hereby granted, free of charge, to any person obtaining a copy of
 this software and associated documentation files (the "Software"), to deal in
 the Software without restriction, including without limitation the rights to
 use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 the Software, and to permit persons to whom the Software is furnished to do so,
 subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { Channel } from "./src/channel.ts";
import { Lastcast } from "./src/lastcast.ts";
import { Multicast } from "./src/multicast.ts";
import { delay } from "https://deno.land/std@0.143.0/async/mod.ts";

console.log("\n=== Channel tests ===\n");

{
  console.log("\n=== Channel test #1 ===\n");
  const channel = new Channel<number>();
  channel.push(1).then((result) => console.log(`value=${result.value} pulled`));
  channel.push(2).then((result) => console.log(`value=${result.value} pulled`));
  channel.push(3).then((result) => console.log(`value=${result.value} pulled`));
  channel.push(4, true); // the second argument closes the iterator when its turn is reached

  // for-await-of uses the async iterable protocol to consume the queue sequentially
  for await (const n of channel) {
    console.log(n); // logs 1, 2, 3
    // doesn't log 4, because for-await-of ignores the value of a closing result
  }
}

{
  console.log("\n=== Channel test #2 ===\n");
  const channel = new Channel<string>();
  const result = channel.next(); // a promise of an iterator result
  result.then(({ value }) => {
    console.log(value);
  });
  channel.push("hello"); // "hello" is logged in the next microtick
}

{
  console.log("\n=== Channel test #3 ===\n");
  const channel = new Channel<number>();
  const tracking = channel.push(123);
  tracking.then((res) => {
    console.log("value was pulled, value:", res.value);
  });
  console.log("value was pushed");
  const result = channel.next(); // pulling the next result resolves `tracking` promise
  console.log(result === tracking); // -> true
  console.log((await result) === (await tracking)); // -> true
}

console.log("\n=== Lastcast tests ===\n");

{
  console.log("\n=== Lastcast test #1 ===\n");
  const channel = new Lastcast<number>();
  channel.push(1);
  channel.push(2);
  channel.push(3);
  channel.push(4, true); // the second argument closes the iterator when its turn is reached

  // for-await-of uses the async iterable protocol to consume the queue sequentially
  for await (const n of channel) {
    console.log(n);
    // doesn't log 1, 2, 3, 4, because for-await-of ignores the value of a closing result
  }

  console.log("(no logs here)");
}

{
  console.log("\n=== Lastcast test #2 ===\n");
  const channel = new Lastcast<number>();
  for (let i = 0; i <= 100; i++) channel.push(i);
  setTimeout(() => {
    channel.push(101, true); // the second argument closes the iterator when its turn is reached
  }, 50);

  // for-await-of uses the async iterable protocol to consume the queue sequentially
  for await (const n of channel) {
    console.log(n); // -> 100
    await delay(100);
  }
}

{
  console.log("\n=== Lastcast test #3 ===\n");
  const channel = new Lastcast<number>();
  setTimeout(() => {
    channel.push(1, true); // exits for-await
  }, 200);

  // for-await-of uses the async iterable protocol to consume the queue sequentially
  for await (const n of channel) {
    console.log(n); // -> doesn't log
    await delay(100);
  }

  console.log("(no logs here)");
}

console.log("\n=== Multicast tests ===\n");

{
  console.log("\n=== Multicast test #1 ===\n");
  const queue = new Multicast();
  // subscribe 5 iterators to receive results
  const subs = [...Array.from({ length: 5 })].map((_) =>
    queue[Symbol.asyncIterator]()
  );
  const proms = subs.map((sub) => sub.next());
  queue.push(123);
  const results = Promise.all(proms);
  console.log(await results); // logs [{ value: 123, done: false },{ value: 123, done: false },{ value: 123, done: false },{ value: 123, done: false },{ value: 123, done: false }]
}

console.log("\n=== Done ===");
